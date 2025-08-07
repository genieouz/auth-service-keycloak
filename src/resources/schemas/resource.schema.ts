import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ResourceDocument = HydratedDocument<Resource>;

@Schema({ timestamps: true })
export class Resource {
  @Prop({ required: true, unique: true, index: true })
  name: string; // Nom unique de la ressource (ex: 'documents', 'users')

  @Prop({ required: true })
  description: string; // Description de la ressource

  @Prop({ required: true, type: [String] })
  actions: string[]; // Actions possibles sur cette ressource (ex: ['read', 'create', 'update', 'delete'])

  @Prop({ required: false, default: 'custom' })
  category?: string; // Catégorie de la ressource

  @Prop({ required: false })
  defaultScope?: string; // Portée par défaut pour les permissions générées

  @Prop({ required: true, default: false })
  isSystem: boolean; // true pour les ressources système, false pour les ressources personnalisées

  @Prop({ required: false })
  customId?: string; // ID généré par l'application pour les ressources personnalisées
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);

// Index composé pour optimiser les recherches
ResourceSchema.index({ category: 1, isSystem: 1 });
ResourceSchema.index({ name: 1, category: 1 });