const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ProfileManager {
  constructor() {
    this.profilesDir = path.join(__dirname, '../profiles');
    this.algorithm = 'aes-256-gcm';
    // Key must be 32 bytes - get from env or generate
    this.key = Buffer.from(
      process.env.PROFILE_ENCRYPTION_KEY || 
      crypto.randomBytes(32).toString('hex').slice(0, 64),
      'hex'
    );
  }

  async encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    };
  }

  async decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async saveProfile(name, profile) {
    try {
      await fs.mkdir(this.profilesDir, { recursive: true });
      
      // Encrypt sensitive fields
      const encryptedProfile = {
        ...profile,
        payment: profile.payment ? 
          await this.encrypt(JSON.stringify(profile.payment)) : 
          null
      };
      
      const filePath = path.join(this.profilesDir, `${name}.enc.json`);
      await fs.writeFile(filePath, JSON.stringify(encryptedProfile, null, 2));
      
      console.log(`✅ Profile '${name}' saved (encrypted)`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save profile:`, error.message);
      return false;
    }
  }

  async loadProfile(name) {
    try {
      const filePath = path.join(this.profilesDir, `${name}.enc.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const encryptedProfile = JSON.parse(data);
      
      // Decrypt payment data if present
      if (encryptedProfile.payment) {
        const decryptedPayment = await this.decrypt(encryptedProfile.payment);
        encryptedProfile.payment = JSON.parse(decryptedPayment);
      }
      
      return encryptedProfile;
    } catch (error) {
      console.error(`❌ Failed to load profile:`, error.message);
      return null;
    }
  }
}

module.exports = ProfileManager;