import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root credentials directory: E:\FS-02\credentials
const CREDENTIALS_DIR = path.resolve(__dirname, '../../../credentials');

/**
 * Automatically saves or updates user details in credentials/ JSON files
 * @param {Object} user User object from Prisma or request
 * @param {string} workspaceName Name of current workspace
 */
export function saveUserToCredentialsFiles(user, workspaceName = 'Acme Innovation Lab') {
  try {
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }

    const usersFile = path.join(CREDENTIALS_DIR, 'users.json');
    let allUsers = [];
    if (fs.existsSync(usersFile)) {
      try {
        allUsers = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      } catch (e) {
        allUsers = [];
      }
    }

    const role = (user.role || 'MEMBER').toUpperCase();
    const userEntry = {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password || 'Password@123',
      role: role,
      title:
        role === 'ADMIN'
          ? 'Lead Architect & Administrator'
          : role === 'VIEWER'
          ? 'Executive Reviewer (Read-Only)'
          : 'Collaborative Member',
      color: user.color || '#3b82f6',
      defaultPermission: role === 'ADMIN' ? 'EDIT' : role === 'VIEWER' ? 'VIEW' : 'EDIT',
      workspaces: [workspaceName],
      registeredAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    };

    // 1. Update or append in credentials/users.json
    const existingIndex = allUsers.findIndex(
      (u) => u.email?.toLowerCase() === user.email?.toLowerCase() || u.id === user.id
    );

    if (existingIndex >= 0) {
      allUsers[existingIndex] = { ...allUsers[existingIndex], ...userEntry };
    } else {
      allUsers.push(userEntry);
    }
    fs.writeFileSync(usersFile, JSON.stringify(allUsers, null, 2), 'utf-8');

    // 2. Update role-specific file: Admin.json, Member.json, Viewer.json
    let roleFileName = 'Member.json';
    if (role === 'ADMIN') roleFileName = 'Admin.json';
    else if (role === 'VIEWER') roleFileName = 'Viewer.json';

    const roleFile = path.join(CREDENTIALS_DIR, roleFileName);
    let roleUsers = [];
    if (fs.existsSync(roleFile)) {
      try {
        roleUsers = JSON.parse(fs.readFileSync(roleFile, 'utf-8'));
      } catch (e) {
        roleUsers = [];
      }
    }

    const roleIndex = roleUsers.findIndex(
      (u) => u.email?.toLowerCase() === user.email?.toLowerCase() || u.id === user.id
    );

    if (roleIndex >= 0) {
      roleUsers[roleIndex] = { ...roleUsers[roleIndex], ...userEntry };
    } else {
      roleUsers.push(userEntry);
    }
    fs.writeFileSync(roleFile, JSON.stringify(roleUsers, null, 2), 'utf-8');

    console.log(
      `💾 [Credentials Auto-Save] Automatically saved "${user.name}" (${user.email}) into credentials/users.json and credentials/${roleFileName}`
    );
  } catch (err) {
    console.error('⚠️ [Credentials Auto-Save] Failed to write credentials file:', err);
  }
}
