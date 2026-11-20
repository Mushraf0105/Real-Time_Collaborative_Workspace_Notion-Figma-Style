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

/**
 * Removes user details from credentials/ JSON files
 * @param {string} userId
 * @param {string} userEmail
 */
export function removeUserFromCredentialsFiles(userId, userEmail) {
  try {
    if (!fs.existsSync(CREDENTIALS_DIR)) return;

    const files = ['users.json', 'Admin.json', 'Member.json', 'Viewer.json'];
    for (const file of files) {
      const filePath = path.join(CREDENTIALS_DIR, file);
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const filtered = data.filter(
            (u) => u.id !== userId && u.email?.toLowerCase() !== userEmail?.toLowerCase()
          );
          fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
        } catch (e) {}
      }
    }
    console.log(`🗑️ [Credentials Auto-Save] Removed user "${userEmail || userId}" from credentials files`);
  } catch (err) {
    console.error('⚠️ [Credentials Auto-Save] Failed to remove user from credentials:', err);
  }
}

/**
 * Synchronizes users defined in credentials/*.json files into the Prisma database.
 * If a user was edited or removed from credentials files on disk, this automatically
 * updates the database to match disk state.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function syncCredentialsToDatabase(prisma) {
  try {
    if (!fs.existsSync(CREDENTIALS_DIR)) return;

    const loadJson = (file) => {
      const p = path.join(CREDENTIALS_DIR, file);
      if (!fs.existsSync(p)) return [];
      try {
        const content = fs.readFileSync(p, 'utf-8');
        return JSON.parse(content);
      } catch (e) {
        return [];
      }
    };

    const adminUsers = loadJson('Admin.json');
    const memberUsers = loadJson('Member.json');
    const viewerUsers = loadJson('Viewer.json');
    const allUsersJson = loadJson('users.json');

    // 1. Gather all active users from credentials files
    const activeMap = new Map();

    const registerUser = (u, defaultRole) => {
      if (!u || !u.name || (!u.email && !u.id)) return;
      const role = (u.role || defaultRole || 'MEMBER').toUpperCase();
      const key = (u.email || u.id).toLowerCase();
      activeMap.set(key, {
        id: u.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: u.name,
        email: u.email || `${u.id}@syncspace.io`,
        password: u.password || 'Password@123',
        avatar: u.avatar || null,
        color: u.color || '#3b82f6',
        role: role,
      });
    };

    for (const u of adminUsers) registerUser(u, 'ADMIN');
    for (const u of memberUsers) registerUser(u, 'MEMBER');
    for (const u of viewerUsers) registerUser(u, 'VIEWER');

    // Also include remaining valid users from users.json if their role list wasn't cleared
    for (const u of allUsersJson) {
      const key = (u.email || u.id).toLowerCase();
      if (u.role === 'ADMIN' && adminUsers.length > 0) {
        if (adminUsers.some((a) => (a.email || a.id).toLowerCase() === key)) {
          registerUser(u, 'ADMIN');
        }
      } else if (u.role === 'VIEWER') {
        if (viewerUsers.some((v) => (v.email || v.id).toLowerCase() === key)) {
          registerUser(u, 'VIEWER');
        }
      } else if (u.role === 'MEMBER' && memberUsers.length > 0) {
        if (memberUsers.some((m) => (m.email || m.id).toLowerCase() === key)) {
          registerUser(u, 'MEMBER');
        }
      }
    }

    const activeList = Array.from(activeMap.values());
    if (activeList.length === 0) return;

    // 2. Sync active users into Prisma DB
    const allWorkspaces = await prisma.workspace.findMany();
    const primaryAdmin = activeList.find((u) => u.role === 'ADMIN') || activeList[0];

    for (const u of activeList) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ id: u.id }, { email: u.email }],
        },
      });

      let dbUser;
      if (existing) {
        dbUser = await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: u.name,
            email: u.email,
            password: u.password,
            color: u.color,
            role: u.role,
            avatar: u.avatar || existing.avatar,
          },
        });
      } else {
        dbUser = await prisma.user.create({
          data: {
            id: u.id,
            name: u.name,
            email: u.email,
            password: u.password,
            color: u.color,
            role: u.role,
            avatar: u.avatar,
          },
        });
      }

      // Ensure membership in workspaces
      for (const ws of allWorkspaces) {
        await prisma.workspaceMember.upsert({
          where: {
            workspaceId_userId: { workspaceId: ws.id, userId: dbUser.id },
          },
          update: { role: dbUser.role },
          create: {
            workspaceId: ws.id,
            userId: dbUser.id,
            role: dbUser.role,
          },
        });
      }
    }

    // 3. Remove users from DB who were removed from credentials
    const activeEmails = new Set(activeList.map((u) => u.email.toLowerCase()));
    const activeIds = new Set(activeList.map((u) => u.id));

    const dbUsers = await prisma.user.findMany();
    for (const dbU of dbUsers) {
      if (!activeEmails.has(dbU.email.toLowerCase()) && !activeIds.has(dbU.id)) {
        console.log(`🧹 [Credentials Auto-Sync] User "${dbU.name}" (${dbU.email}) removed from credentials. Cleaning up DB...`);
        await prisma.document.updateMany({
          where: { createdBy: dbU.id },
          data: { createdBy: primaryAdmin.id },
        });
        await prisma.documentSnapshot.updateMany({
          where: { createdBy: dbU.id },
          data: { createdBy: primaryAdmin.id },
        });
        await prisma.workspace.updateMany({
          where: { ownerId: dbU.id },
          data: { ownerId: primaryAdmin.id },
        });
        await prisma.workspaceMember.deleteMany({ where: { userId: dbU.id } });
        await prisma.documentPermission.deleteMany({ where: { userId: dbU.id } });
        await prisma.comment.deleteMany({ where: { userId: dbU.id } });
        await prisma.user.delete({ where: { id: dbU.id } });
      }
    }

    // 4. Update credentials/users.json so it matches the active consolidated state
    const consolidated = activeList.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      title:
        u.role === 'ADMIN'
          ? 'Lead Architect & Administrator'
          : u.role === 'VIEWER'
          ? 'Executive Reviewer (Read-Only)'
          : 'Collaborative Member',
      color: u.color,
      avatar: u.avatar,
      defaultPermission: u.role === 'ADMIN' ? 'EDIT' : u.role === 'VIEWER' ? 'VIEW' : 'EDIT',
      workspaces: allWorkspaces.map((w) => w.name),
      registeredAt: new Date().toISOString(),
    }));

    fs.writeFileSync(
      path.join(CREDENTIALS_DIR, 'users.json'),
      JSON.stringify(consolidated, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('⚠️ [Credentials Auto-Sync] Failed to sync credentials to DB:', err);
  }
}


