import * as NodeID3 from 'node-id3';
import { Logger } from './logger';

/**
 * @interface ID3Metadata
 * @description The metadata for an MP3 file
 * @example
 * const metadata: ID3Metadata = {
 *   title: 'Test Title',
 *   artist: 'Test Artist',
 *   album: 'Test Album',
 *   year: '2025',
 *   genre: 'Test Genre',
 *   comment: 'Test Comment',
 *   composer: 'Test Composer',
 *   albumArtist: 'Test Album Artist',
 *   artwork: 'https://img.pokemondb.net/artwork/large/jigglypuff.jpg',
 *   track: '1',
 *   other: 'Test Other',
 * };
 */
export interface ID3Metadata {
  /**
   * @title - The title of the song
   */
  title?: string;

  /**
   * @artist - The artist of the song
   */
  artist?: string;

  /**
   * @album - The album of the song
   */
  album?: string;

  /**
   * @year - The year of the song
   */
  genre?: string;

  /**
   * @comment - The comment of the song
   */
  comment?: string;

  /**
   * @lyrics - The lyrics of the song
   */
  lyrics?: string;

  /**
   * @composer - The composer of the song
   */
  composer?: string;

  /**
   * @albumArtist - The album artist of the song
   */
  albumArtist?: string;

  /**
   * @bpm - The BPM of the song
   */
  bpm?: string | number;

  /**
   * @artwork - The artwork of the song
   */
  artwork?: string;

  /**
   * @[key: string] - Any other metadata
   */
  [key: string]: any;
}

/**
 * @class ID3TagProcessor
 * @description Processes ID3 tags for an MP3 file
 * @example
 * const id3TagProcessor = new ID3TagProcessor();
 * const mp3Buffer = await id3TagProcessor.applyTags(mp3Buffer, {
 *   title: 'Test Title',
 *   artist: 'Test Artist',
 *   album: 'Test Album',
 *   year: '2025',
 *   genre: 'Test Genre',
 *   comment: 'Test Comment',
 *   lyrics: 'Test Lyrics',
 *   composer: 'Test Composer',
 *   albumArtist: 'Test Album Artist',
 *   bpm: '120',
 *   artwork: 'https://img.pokemondb.net/artwork/large/jigglypuff.jpg',
 *   track: '1',
 *   other: 'Test Other',
 * });
 */
export class ID3TagProcessor {
  private logger = new Logger();

  /**
   * Converts an image URL to a Buffer
   * @param imageUrl - The URL of the image
   * @returns The MIME type and image buffer
   */
  private  async imageUrlToBuffer(imageUrl: string): Promise<{ mime: string, imageBuffer: Buffer }> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const mime = response.headers.get('content-type')!;
    // check if it is an image
    if (!mime.startsWith('image/')) {
      throw new Error(`Invalid image URL: ${imageUrl} - ${mime}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return { mime, imageBuffer: Buffer.from(arrayBuffer) };
  }

  /**
   * Applies ID3 tags to an MP3 buffer
   * @param mp3Buffer - The MP3 file as a Buffer
   * @param metadata - The metadata to apply as ID3 tags
   * @returns Buffer with ID3 tags applied
   */
  async applyTags(audioBuffer: Buffer, metadata: ID3Metadata): Promise<Buffer> {
    try {
      this.logger.info('Applying ID3 tags', { metadata });

      // Convert metadata to NodeID3 format
      const id3Tags = await this.convertToID3Format(metadata);

      // Apply tags to the MP3 buffer
      const taggedBuffer = NodeID3.write(id3Tags, audioBuffer);

      if (!taggedBuffer) {
        throw new Error('Failed to write ID3 tags to Audio');
      }

      this.logger.info('Successfully applied ID3 tags');
      return taggedBuffer;

    } catch (error) {
      this.logger.error('Error applying ID3 tags', { error, metadata });
      throw error;
    }
  }

  /**
   * Converts generic metadata to NodeID3 format
   * @param metadata - Generic metadata object
   * @returns NodeID3 compatible tags object
   */
  private async convertToID3Format(metadata: ID3Metadata): Promise<NodeID3.Tags> {
    const tags: NodeID3.Tags = {};

    // Map common fields
    if (metadata.title) tags.title = metadata.title;
    if (metadata.artist) tags.artist = metadata.artist;
    if (metadata.album) tags.album = metadata.album;
    if (metadata.year) tags.year = metadata.year.toString();
    if (metadata.genre) tags.genre = metadata.genre;
    if (metadata.comment) tags.comment = { language: 'eng', text: metadata.comment };
    if (metadata.lyrics) tags.unsynchronisedLyrics = { language: 'eng', text: metadata.lyrics };
    if (metadata.composer) tags.composer = metadata.composer;
    if (metadata.albumArtist) tags.performerInfo = metadata.albumArtist;
    if (metadata.bpm) tags.bpm = metadata.bpm.toString();
    if (metadata.track) tags.trackNumber = metadata.track.toString();
    if (metadata.artwork) {
      try {
        const { mime, imageBuffer } = await this.imageUrlToBuffer(metadata.artwork);
        tags.image = {
          mime,
          type: {
            id: NodeID3.TagConstants.AttachedPicture.PictureType.FRONT_COVER
          }, // See https://en.wikipedia.org/wiki/ID3#ID3v2_embedded_image_extension
          description: 'Cover',
          imageBuffer,
        };
      } catch (error) {
        this.logger.error("Error converting image URL to Buffer", error);
      }
    };

    // Handle custom fields
    Object.keys(metadata).forEach(key => {
      if (!this.isStandardField(key) && metadata[key]) {
        tags.userDefinedText = tags.userDefinedText || [];
        tags.userDefinedText.push({
          description: key,
          value: metadata[key].toString()
        });
      }
    });

    return tags;
  }

  /**
   * Checks if a field is a standard ID3 field
   * @param fieldName - The field name to check
   * @returns True if it's a standard field
   */
  private isStandardField(fieldName: string): boolean {
    const standardFields = [
      'title', 'artist', 'album', 'year', 'track', 'genre',
      'comment', 'lyrics', 'composer', 'albumArtist', 'bpm', 
      'artwork',
    ];
    return standardFields.includes(fieldName.toLowerCase());
  }

  /**
   * Reads existing ID3 tags from an MP3 buffer
   * @param mp3Buffer - The MP3 file as a Buffer
   * @returns The existing ID3 tags or null if none found
   */
  readTags(mp3Buffer: Buffer): NodeID3.Tags | null {
    try {
      return NodeID3.read(mp3Buffer);
    } catch (error) {
      this.logger.warn('Could not read existing ID3 tags', { error });
      return null;
    }
  }
}
