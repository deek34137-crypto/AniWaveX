/**
 * Base Hindi Provider Interface
 */

export class BaseProvider {
  constructor(metadata) {
    this.id = metadata.id;
    this.name = metadata.name;
    this.languages = metadata.languages || ['hi'];
    this.type = metadata.type || 'hindi';
    this.priority = metadata.priority || 5;
    this.enabled = metadata.enabled !== false;
  }

  /**
   * Search for an anime title
   * @param {string} query
   * @returns {Promise<Array<{ id: string, slug: string, title: string, type: string, url: string, image?: string }>>}
   */
  async search(query) {
    throw new Error(`search() not implemented on ${this.name}`);
  }

  /**
   * Resolve series slug from AniList ID, MAL ID, or candidate title
   * @param {string|number} queryOrId
   * @param {string} fallbackTitle
   * @returns {Promise<string|null>}
   */
  async resolveSlug(queryOrId, fallbackTitle = '') {
    throw new Error(`resolveSlug() not implemented on ${this.name}`);
  }

  /**
   * Fetch episode list for series slug
   * @param {string} seriesSlug
   * @returns {Promise<Array<{ id: string, number: number, season: number, title: string, audio: string }>>}
   */
  async getEpisodes(seriesSlug) {
    throw new Error(`getEpisodes() not implemented on ${this.name}`);
  }

  /**
   * Extract video stream sources for an episode
   * @param {string} seriesSlug
   * @param {string|number} epIdentifier
   * @param {object} options
   * @returns {Promise<Array<{ server: string, url: string, directUrl?: string, type: string, quality: string, isM3U8: boolean, isHindi: boolean, subtitles?: Array, audioTracks?: Array }>>}
   */
  async getStreams(seriesSlug, epIdentifier, options = {}) {
    throw new Error(`getStreams() not implemented on ${this.name}`);
  }
}
