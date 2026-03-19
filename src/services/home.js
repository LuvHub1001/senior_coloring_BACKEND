const userService = require('./user');
const artworkService = require('./artwork');
const themeService = require('./theme');

async function getHomeData(userId) {
  const [user, artworks, themes] = await Promise.all([
    userService.getUserProfile(userId),
    artworkService.getMyArtworks({ userId, status: 'COMPLETED', limit: 20 }),
    themeService.getThemes(userId),
  ]);

  return {
    user,
    completedArtworks: artworks,
    themes,
  };
}

module.exports = { getHomeData };
