import { KeycloakUser } from '../interfaces/keycloak.interface';
import { UserProfileDto } from '../dto/response.dto';

/**
 * Utilitaire pour mapper les données utilisateur entre Keycloak et l'API
 */
export class UserMapperUtil {
  /**
   * Convertit un utilisateur Keycloak en UserProfileDto avec attributs aplatis
   */
  static mapKeycloakUserToProfile(keycloakUser: KeycloakUser, roles: string[] = [], clientRoles: string[] = []): UserProfileDto {
    const attributes = keycloakUser.attributes || {};
    
    // Extraire et convertir les attributs de string[] vers les types appropriés
    const profile: UserProfileDto = {
      id: keycloakUser.id,
      username: keycloakUser.username,
      email: keycloakUser.email,
      firstName: keycloakUser.firstName,
      lastName: keycloakUser.lastName,
      enabled: keycloakUser.enabled,
      emailVerified: keycloakUser.emailVerified || false,
      roles,
      clientRoles,
      registrationDate: this.getFirstAttributeValue(attributes.registrationDate) || new Date().toISOString(),
      
      // Attributs aplatis
      phone: this.getFirstAttributeValue(attributes.phone),
      birthDate: this.getFirstAttributeValue(attributes.birthDate),
      gender: this.getFirstAttributeValue(attributes.gender),
      address: this.getFirstAttributeValue(attributes.address),
      city: this.getFirstAttributeValue(attributes.city),
      postalCode: this.getFirstAttributeValue(attributes.postalCode),
      country: this.getFirstAttributeValue(attributes.country),
      profession: this.getFirstAttributeValue(attributes.profession),
      acceptTerms: this.getBooleanAttributeValue(attributes.acceptTerms, true),
      acceptPrivacyPolicy: this.getBooleanAttributeValue(attributes.acceptPrivacyPolicy, true),
      acceptMarketing: this.getBooleanAttributeValue(attributes.acceptMarketing, false),
      accountType: this.getFirstAttributeValue(attributes.accountType),
    };

    // Collecter les attributs personnalisés non mappés
    const mappedKeys = new Set([
      'phone', 'birthDate', 'gender', 'address', 'city', 'postalCode', 
      'country', 'profession', 'acceptTerms', 'acceptPrivacyPolicy', 
      'acceptMarketing', 'registrationDate', 'accountType', 'emailVerified', 
      'phoneVerified', 'accountSetupComplete'
    ]);

    const customAttributes: { [key: string]: any } = {};
    Object.keys(attributes).forEach(key => {
      if (!mappedKeys.has(key)) {
        customAttributes[key] = attributes[key];
      }
    });

    if (Object.keys(customAttributes).length > 0) {
      profile.customAttributes = customAttributes;
    }

    return profile;
  }

  /**
   * Convertit un UpdateUserDto en format Keycloak avec attributs structurés
   */
  static mapUpdateDtoToKeycloak(updateDto: any): Partial<KeycloakUser> {
    const keycloakData: Partial<KeycloakUser> = {};

    // Champs principaux
    if (updateDto.email !== undefined) keycloakData.email = updateDto.email;
    if (updateDto.firstName !== undefined) keycloakData.firstName = updateDto.firstName;
    if (updateDto.lastName !== undefined) keycloakData.lastName = updateDto.lastName;
    if (updateDto.enabled !== undefined) keycloakData.enabled = updateDto.enabled;

    // Construire les attributs
    const attributes: { [key: string]: string[] } = {};
    
    if (updateDto.phone !== undefined) attributes.phone = [updateDto.phone];
    if (updateDto.birthDate !== undefined) attributes.birthDate = [updateDto.birthDate];
    if (updateDto.gender !== undefined) attributes.gender = [updateDto.gender];
    if (updateDto.address !== undefined) attributes.address = [updateDto.address];
    if (updateDto.city !== undefined) attributes.city = [updateDto.city];
    if (updateDto.postalCode !== undefined) attributes.postalCode = [updateDto.postalCode];
    if (updateDto.country !== undefined) attributes.country = [updateDto.country];
    if (updateDto.profession !== undefined) attributes.profession = [updateDto.profession];
    if (updateDto.acceptMarketing !== undefined) {
      attributes.acceptMarketing = [updateDto.acceptMarketing.toString()];
    }

    if (Object.keys(attributes).length > 0) {
      keycloakData.attributes = attributes;
    }

    return keycloakData;
  }

  /**
   * Extrait la première valeur d'un attribut Keycloak (string[])
   */
  private static getFirstAttributeValue(attributeArray?: string[]): string | undefined {
    return attributeArray && attributeArray.length > 0 ? attributeArray[0] : undefined;
  }

  /**
   * Convertit un attribut Keycloak en boolean
   */
  private static getBooleanAttributeValue(attributeArray?: string[], defaultValue: boolean = false): boolean {
    const value = this.getFirstAttributeValue(attributeArray);
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  }
}