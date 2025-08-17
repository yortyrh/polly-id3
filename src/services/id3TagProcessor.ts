import * as NodeID3 from 'node-id3';
import { Logger } from './logger';

export interface ID3Metadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string | number;
  track?: string | number;
  genre?: string;
  comment?: string;
  lyrics?: string;
  composer?: string;
  albumArtist?: string;
  disc?: string | number;
  bpm?: string | number;
  picture?: string;
  [key: string]: any;
}

export class ID3TagProcessor {
  private logger = new Logger();

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
  async applyTags(mp3Buffer: Buffer, metadata: ID3Metadata): Promise<Buffer> {
    try {
      this.logger.info('Applying ID3 tags', { metadata });

      // Convert metadata to NodeID3 format
      const id3Tags = await this.convertToID3Format(metadata);

      // Apply tags to the MP3 buffer
      const taggedBuffer = NodeID3.write(id3Tags, mp3Buffer);

      if (!taggedBuffer) {
        throw new Error('Failed to write ID3 tags to MP3');
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
    if (metadata.picture) {
      try {
        const { mime, imageBuffer } = await this.imageUrlToBuffer(metadata.picture);
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
      'picture',
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
