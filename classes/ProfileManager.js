const fs = require('fs').promises;
const path = require('path');

class ProfileManager {
  constructor() {
    this.profilesDir = path.join(__dirname, '../profiles');
    this.profiles = new Map();
  }

  async loadProfile(name) {
    try {
      const filePath = path.join(this.profilesDir, `${name}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const profile = JSON.parse(data);
      this.profiles.set(name, profile);
      return profile;
    } catch (error) {
      console.error(`Failed to load profile ${name}:`, error.message);
      return null;
    }
  }

  async saveProfile(name, profile) {
    try {
      await fs.mkdir(this.profilesDir, { recursive: true });
      const filePath = path.join(this.profilesDir, `${name}.json`);
      await fs.writeFile(filePath, JSON.stringify(profile, null, 2));
      this.profiles.set(name, profile);
      return true;
    } catch (error) {
      console.error(`Failed to save profile ${name}:`, error.message);
      return false;
    }
  }

  getProfile(name) {
    return this.profiles.get(name);
  }

  listProfiles() {
    return Array.from(this.profiles.keys());
  }
}

module.exports = ProfileManager;