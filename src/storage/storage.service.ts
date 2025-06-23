import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
// import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
  isSignedUrl: boolean;
  expiresAt?: Date;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly minioClient: MinioClient;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get('MINIO_BUCKET_NAME');
    this.publicUrl = this.configService.get('MINIO_PUBLIC_URL') || '';

    this.minioClient = new MinioClient({
      endPoint: this.configService.get('MINIO_ENDPOINT'),
      port: parseInt(this.configService.get('MINIO_PORT')),
      useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY'),
      secretKey: this.configService.get('MINIO_SECRET_KEY'),
    });

    this.initializeBucket();
  }

  /**
   * Initialiser le bucket MinIO
   */
  private async initializeBucket(): Promise<void> {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket créé: ${this.bucketName}`);
        
        // Définir la politique publique seulement si on a une URL publique
        if (this.publicUrl) {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucketName}/avatars/*`],
              },
            ],
          };

          await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
          this.logger.log(`Politique publique définie pour le bucket: ${this.bucketName}`);
        }
      }
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation du bucket MinIO', error);
    }
  }

  /**
   * Uploader un avatar utilisateur
   */
  async uploadAvatar(file: any, userId: string): Promise<UploadResult> {
    try {
      this.validateImageFile(file);

      // Générer un nom de fichier unique
      const fileExtension = this.getFileExtension(file.originalname);
      const fileName = `avatars/${userId}/${uuidv4()}.${fileExtension}`;

      // Redimensionner et optimiser l'image
      const processedImage = await this.processAvatarImage(file.buffer);

      // Uploader vers MinIO
      const uploadInfo = await this.minioClient.putObject(
        this.bucketName,
        fileName,
        processedImage.buffer,
        processedImage.size,
        {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000', // 1 an
        }
      );

      // Générer l'URL selon la configuration
      let url: string;
      let isSignedUrl = false;
      let expiresAt: Date | undefined;

      if (this.publicUrl) {
        // URL publique directe
        url = `${this.publicUrl}/${this.bucketName}/${fileName}`;
      } else {
        // URL signée temporaire (7 jours par défaut)
        const expirySeconds = 7 * 24 * 60 * 60; // 7 jours
        url = await this.minioClient.presignedGetObject(this.bucketName, fileName, expirySeconds);
        isSignedUrl = true;
        expiresAt = new Date(Date.now() + expirySeconds * 1000);
      }

      this.logger.log(`Avatar uploadé avec succès: ${fileName} pour l'utilisateur ${userId}`);

      return {
        fileName,
        url,
        size: processedImage.size,
        mimeType: 'image/jpeg',
        isSignedUrl,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'upload d'avatar pour l'utilisateur ${userId}`, error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors de l\'upload de l\'avatar');
    }
  }

  /**
   * Supprimer un avatar
   */
  async deleteAvatar(fileName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, fileName);
      this.logger.log(`Avatar supprimé: ${fileName}`);
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'avatar: ${fileName}`, error);
      // Ne pas faire échouer l'opération si la suppression échoue
    }
  }

  /**
   * Supprimer tous les avatars d'un utilisateur
   */
  async deleteUserAvatars(userId: string): Promise<void> {
    try {
      const objectsStream = this.minioClient.listObjects(this.bucketName, `avatars/${userId}/`, true);
      const objectsToDelete: string[] = [];

      for await (const obj of objectsStream) {
        if (obj.name) {
          objectsToDelete.push(obj.name);
        }
      }

      if (objectsToDelete.length > 0) {
        await this.minioClient.removeObjects(this.bucketName, objectsToDelete);
        this.logger.log(`${objectsToDelete.length} avatar(s) supprimé(s) pour l'utilisateur ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression des avatars de l'utilisateur ${userId}`, error);
    }
  }

  /**
   * Obtenir l'URL d'un avatar
   */
  async getAvatarUrl(fileName: string): Promise<string> {
    if (this.publicUrl) {
      return `${this.publicUrl}/${this.bucketName}/${fileName}`;
    } else {
      // Générer une URL signée de 24h pour l'affichage
      return await this.minioClient.presignedGetObject(this.bucketName, fileName, 24 * 60 * 60);
    }
  }

  /**
   * Générer une URL signée temporaire
   */
  async getSignedAvatarUrl(fileName: string, expirySeconds: number = 3600): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(this.bucketName, fileName, expirySeconds);
    } catch (error) {
      this.logger.error(`Erreur lors de la génération d'URL signée pour: ${fileName}`, error);
      throw new InternalServerErrorException('Erreur lors de la génération de l\'URL d\'avatar');
    }
  }

  /**
   * Vérifier si une URL signée a expiré et la renouveler si nécessaire
   */
  async refreshAvatarUrlIfNeeded(fileName: string, currentUrl: string, expiresAt?: Date): Promise<{
    url: string;
    isSignedUrl: boolean;
    expiresAt?: Date;
    needsUpdate: boolean;
  }> {
    // Si on a une URL publique, pas besoin de renouveler
    if (this.publicUrl) {
      return {
        url: currentUrl,
        isSignedUrl: false,
        needsUpdate: false,
      };
    }

    // Si pas de date d'expiration ou si elle expire dans moins d'1 heure, renouveler
    if (!expiresAt || expiresAt.getTime() - Date.now() < 60 * 60 * 1000) {
      const newUrl = await this.getSignedAvatarUrl(fileName, 7 * 24 * 60 * 60); // 7 jours
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      this.logger.log(`URL d'avatar renouvelée pour: ${fileName}`);
      
      return {
        url: newUrl,
        isSignedUrl: true,
        expiresAt: newExpiresAt,
        needsUpdate: true,
      };
    }

    return {
      url: currentUrl,
      isSignedUrl: true,
      expiresAt,
      needsUpdate: false,
    };
  }

  /**
   * Valider le fichier image
   */
  private validateImageFile(file: any): void {
    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('La taille du fichier ne peut pas dépasser 5MB');
    }

    // Vérifier le type MIME
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Format de fichier non supporté. Utilisez JPG, PNG ou WebP');
    }

    // Vérifier l'extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const fileExtension = this.getFileExtension(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException('Extension de fichier non supportée');
    }
  }

  /**
   * Traiter et optimiser l'image d'avatar
   */
  private async processAvatarImage(buffer: Buffer): Promise<{ buffer: Buffer; size: number }> {
    try {
      // Version temporaire sans Sharp - retourne l'image originale
      this.logger.warn('Sharp désactivé - image non optimisée');
      return {
        buffer,
        size: buffer.length,
      };
      
      /* Version avec Sharp (à réactiver après correction)
      const processedBuffer = await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toBuffer();

      return {
        buffer: processedBuffer,
        size: processedBuffer.length,
      };
      */
    } catch (error) {
      this.logger.error('Erreur lors du traitement de l\'image', error);
      throw new BadRequestException('Fichier image invalide ou corrompu');
    }
  }

  /**
   * Extraire l'extension d'un fichier
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  /**
   * Vérifier la santé du service MinIO
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.minioClient.bucketExists(this.bucketName);
      return true;
    } catch (error) {
      this.logger.error('Service MinIO indisponible', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques du bucket
   */
  async getBucketStats(): Promise<{ objectCount: number; totalSize: number }> {
    try {
      let objectCount = 0;
      let totalSize = 0;

      const objectsStream = this.minioClient.listObjects(this.bucketName, '', true);
      
      for await (const obj of objectsStream) {
        objectCount++;
        totalSize += obj.size || 0;
      }

      return { objectCount, totalSize };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des statistiques du bucket', error);
      return { objectCount: 0, totalSize: 0 };
    }
  }

  /**
   * Vérifier si une URL signée va expirer bientôt
   */
  isUrlExpiringSoon(expiresAt?: Date, thresholdHours: number = 1): boolean {
    if (!expiresAt) return true;
    
    const thresholdMs = thresholdHours * 60 * 60 * 1000;
    return expiresAt.getTime() - Date.now() < thresholdMs;
  }

  /**
   * Renouveler une URL signée avec une nouvelle durée de validité
   */
  async renewSignedUrl(fileName: string, expiryDays: number = 7): Promise<{
    url: string;
    expiresAt: Date;
  }> {
    const expirySeconds = expiryDays * 24 * 60 * 60;
    const url = await this.getSignedAvatarUrl(fileName, expirySeconds);
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);
    
    return { url, expiresAt };
  }
}