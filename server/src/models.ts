import { Schema, model, type Types } from 'mongoose';
import type { AnalysisSource, RoleMatch } from './types';

export interface UserDoc {
  _id: Types.ObjectId;
  googleId: string;
  name: string;
  email: string;
  picture?: string;
  passwordHash?: string;
}

const userSchema = new Schema<UserDoc>(
  {
    googleId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    picture: { type: String },
    passwordHash: { type: String },
  },
  { timestamps: true },
);

export const User = model<UserDoc>('User', userSchema);

export interface RoleDoc {
  title: string;
  seniority: string;
  summary: string;
  skills: string[];
}

const roleSchema = new Schema<RoleDoc>(
  {
    title: { type: String, required: true, unique: true },
    seniority: { type: String, required: true },
    summary: { type: String, required: true },
    skills: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Role = model<RoleDoc>('Role', roleSchema);

export interface AnalysisDoc {
  _id: Types.ObjectId;
  user?: Types.ObjectId;
  fileName?: string;
  skills: string[];
  summary: string;
  roles: RoleMatch[];
  source: AnalysisSource;
  createdAt?: Date;
  updatedAt?: Date;
}

const roleMatchSchema = new Schema<RoleMatch>(
  {
    title: { type: String, required: true },
    matchPercent: { type: Number, required: true },
    seniority: { type: String, default: '' },
    summary: { type: String, default: '' },
    why: { type: String, default: '' },
    skills: { type: [String], default: [] },
  },
  { _id: false },
);

const analysisSchema = new Schema<AnalysisDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    fileName: { type: String },
    skills: { type: [String], default: [] },
    summary: { type: String, default: '' },
    roles: { type: [roleMatchSchema], default: [] },
    source: { type: String, enum: ['grok', 'local'], default: 'local' },
  },
  { timestamps: true },
);

export const Analysis = model<AnalysisDoc>('Analysis', analysisSchema);

/** Idempotent seed of the role library from nextrole.json. */
export async function seedRoles(
  catalog: Array<{ title: string; seniority: string; summary: string; skills: string[] }>,
): Promise<void> {
  for (const role of catalog) {
    try {
      await Role.updateOne({ title: role.title }, { $setOnInsert: role }, { upsert: true });
    } catch {
      // Database offline - the API falls back to the JSON catalog.
      return;
    }
  }
}
