import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({ timestamps: true })
export class Permission {
  @Prop({ required: true, unique: true, index: true })
  name: string; // Format: resource:action ou resource:action:scope

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, index: true })
  resource: string;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: false })
  scope?: string;

  @Prop({ required: false, default: 'custom' })
  category?: string;

  @Prop({ required: true, default: false })
  isSystem: boolean; // true pour les permissions système, false pour les permissions personnalisées

  @Prop({ required: false })
  customId?: string; // ID généré par l'application pour les permissions personnalisées
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

// Index composé pour optimiser les recherches
PermissionSchema.index({ resource: 1, action: 1, scope: 1 });
PermissionSchema.index({ category: 1, isSystem: 1 });