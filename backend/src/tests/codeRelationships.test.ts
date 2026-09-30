import { extractRelationships } from '../utils/codeRelationships';

describe('Code Relationship Extractor', () => {
  it('extracts ES module IMPORTS, EXPORTS, and EXTENDS', () => {
    const code = `
import { UserService } from './services/userService';
import jwt from 'jsonwebtoken';

export class AdminService extends UserService {
  doAdminWork() {}
}

export const adminRole = 'admin';
`;

    const rels = extractRelationships('src/admin.ts', code, 'TypeScript', 'repo-1');

    // Should find imports
    const importRel = rels.find((r) => r.relationship_type === 'IMPORTS' && r.target_symbol === 'UserService');
    expect(importRel).toBeDefined();
    expect(importRel?.target_file_path).toBe('src/services/userService');

    // Should find extends
    const extendsRel = rels.find((r) => r.relationship_type === 'EXTENDS');
    expect(extendsRel).toBeDefined();
    expect(extendsRel?.source_symbol).toBe('AdminService');
    expect(extendsRel?.target_symbol).toBe('UserService');

    // Should find exports
    const exportRel = rels.find((r) => r.relationship_type === 'EXPORTS' && r.source_symbol === 'AdminService');
    expect(exportRel).toBeDefined();
  });

  it('detects database interactions', () => {
    const dbCode = `
import { pool } from './db';

export async function getUser(id: string) {
  return pool.query('SELECT * FROM users WHERE id = $1', [id]);
}
`;

    const rels = extractRelationships('src/repo/userRepo.ts', dbCode, 'TypeScript', 'repo-1');
    const dbRel = rels.find((r) => r.relationship_type === 'DATABASE');
    expect(dbRel).toBeDefined();
    expect(dbRel?.target_symbol).toBe('Database');
  });

  it('extracts Python imports and class inheritance', () => {
    const pyCode = `
from models.user import User
import database

class Customer(User):
    pass
`;

    const rels = extractRelationships('services/customer.py', pyCode, 'Python', 'repo-1');
    expect(rels.some((r) => r.relationship_type === 'IMPORTS' && r.target_symbol === 'User')).toBe(true);
    expect(rels.some((r) => r.relationship_type === 'EXTENDS' && r.source_symbol === 'Customer')).toBe(true);
  });
});
