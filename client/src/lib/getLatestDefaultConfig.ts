import { ConfigFile } from '@shared/schema';
import { extractZipFile } from './file-handling';
import JSZip from 'jszip';

// Define the structure for GitHub release data
interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: {
    name: string;
    browser_download_url: string;
    size: number;
  }[];
}

// Define the structure for default config options
export interface DefaultConfigOption {
  name: string;
  description?: string;
  fileName: string;
  downloadUrl: string;
  size: number;
  formattedSize: string;
  releaseTag: string;
  releaseDate: string;
  source: string;
  isZipped?: boolean;
  comapeoCatInZip?: string;
}

// Repository information
const REPOSITORIES = [
  {
    name: 'mapeo-default-config',
    url: 'https://api.github.com/repos/digidem/mapeo-default-config/releases/latest',
    displayName: 'MapeoDefault',
  },
  {
    name: 'comapeo-category-library',
    url: 'https://api.github.com/repos/digidem/comapeo-category-library/releases/latest',
    displayName: 'CoMapeoLibrary',
  },
];

/**
 * Format a file size for display
 */
function formatFileSize(sizeInBytes: number): string {
  const sizeInKB = sizeInBytes / 1024;
  return sizeInKB > 1024
    ? `${(sizeInKB / 1024).toFixed(2)}MB`
    : `${sizeInKB.toFixed(2)}KB`;
}

/**
 * Create a friendly name from a filename
 */
function createFriendlyName(filename: string): string {
  // Remove extension and replace hyphens/underscores with spaces
  const baseName = filename
    .replace(/\.(comapeocat|zip)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize first letter of each word
  return baseName;
}

/**
 * Checks if a zip file contains a .comapeocat file
 * @returns The name of the .comapeocat file if found, otherwise null
 */
async function checkZipForComapeoCat(zipBlob: Blob): Promise<string | null> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipBlob);
    // Look for .comapeocat files in the zip
    const comapeoCatFile = Object.keys(contents.files).find((filename) =>
      filename.toLowerCase().endsWith('.comapeocat')
    );
    return comapeoCatFile || null;
  } catch (error) {
    console.error('Error checking zip file:', error);
    return null;
  }
}

/**
 * Processes assets from a GitHub release
 */
async function processReleaseAssets(
  release: GitHubRelease,
  repoInfo: { name: string; displayName: string }
): Promise<DefaultConfigOption[]> {
  const options: DefaultConfigOption[] = [];

  // First, process direct .comapeocat files
  const comapeoCatFiles = release.assets.filter((asset) =>
    asset.name.toLowerCase().endsWith('.comapeocat')
  );
  for (const asset of comapeoCatFiles) {
    options.push({
      name: `${createFriendlyName(asset.name)} (${repoInfo.displayName})`,
      fileName: asset.name,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      formattedSize: formatFileSize(asset.size),
      releaseTag: release.tag_name,
      releaseDate: new Date(release.published_at).toLocaleDateString(),
      source: repoInfo.displayName,
    });
  }

  // Then, check zip files for .comapeocat files inside
  const zipFiles = release.assets.filter((asset) =>
    asset.name.toLowerCase().endsWith('.zip')
  );
  for (const zipAsset of zipFiles) {
    try {
      // Download the zip file to check its contents
      const response = await fetch(zipAsset.browser_download_url);
      if (!response.ok) continue;

      const zipBlob = await response.blob();
      const comapeoCatInZip = await checkZipForComapeoCat(zipBlob);
      if (comapeoCatInZip) {
        options.push({
          name: `${createFriendlyName(comapeoCatInZip)} (${repoInfo.displayName}, from ${zipAsset.name})`,
          fileName: zipAsset.name,
          downloadUrl: zipAsset.browser_download_url,
          size: zipAsset.size,
          formattedSize: formatFileSize(zipAsset.size),
          releaseTag: release.tag_name,
          releaseDate: new Date(release.published_at).toLocaleDateString(),
          source: repoInfo.displayName,
          isZipped: true,
          comapeoCatInZip,
        });
      }
    } catch (error) {
      console.error(`Error processing zip file ${zipAsset.name}:`, error);
    }
  }

  return options;
}

/**
 * Fetches the latest releases from configured repositories
 * and extracts information about available .comapeocat files
 */
export async function getLatestDefaultConfigs(): Promise<DefaultConfigOption[]> {
  try {
    const allOptions: DefaultConfigOption[] = [];

    // Process each repository in parallel
    const results = await Promise.allSettled(
      REPOSITORIES.map(async (repo) => {
        try {
          // Fetch the latest release from GitHub API
          const response = await fetch(repo.url);
          if (!response.ok) {
            throw new Error(`GitHub API error for ${repo.name}: ${response.status} ${response.statusText}`);
          }
          const release: GitHubRelease = await response.json();
          return await processReleaseAssets(release, {
            name: repo.name,
            displayName: repo.displayName,
          });
        } catch (error) {
          console.error(`Error fetching from ${repo.name}:`, error);
          return [];
        }
      })
    );

    // Combine results from all repositories
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allOptions.push(...result.value);
      }
    });
    if (allOptions.length === 0) {
      console.log('No .comapeocat files found in any repository');
    }

    // Sort by source and then by name
    return allOptions.sort((a, b) => {
      if (a.source !== b.source) {
        return a.source.localeCompare(b.source);
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error fetching default configs:', error);
    throw error;
  }
}

/**
 * Downloads and processes a default configuration file
 * @param configOption The selected default configuration option
 * @param onProgress Optional callback for progress updates
 * @returns Array of ConfigFile objects
 */
export async function downloadAndProcessDefaultConfig(
  configOption: DefaultConfigOption,
  onProgress?: (progress: number, message: string) => void
): Promise<ConfigFile[]> {
  try {
    onProgress?.(10, `Downloading ${configOption.name}...`);

    // Download the file
    const response = await fetch(configOption.downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    // Convert to blob
    const blob = await response.blob();
    onProgress?.(30, 'Processing configuration file...');

    // Handle different file types
    if (configOption.isZipped && configOption.comapeoCatInZip) {
      // This is a zip file containing a .comapeocat file
      onProgress?.(40, 'Extracting .comapeocat from zip file...');

      // Extract the .comapeocat file from the zip
      const zip = new JSZip();
      const contents = await zip.loadAsync(blob);

      // Get the .comapeocat file from the zip
      const comapeoCatEntry = contents.files[configOption.comapeoCatInZip];
      if (!comapeoCatEntry) {
        throw new Error(`Could not find ${configOption.comapeoCatInZip} in the zip file`);
      }

      // Extract the .comapeocat file
      const comapeoCatBlob = await comapeoCatEntry.async('blob');

      // Create a File object from the .comapeocat blob
      const comapeoCatFile = new File([comapeoCatBlob], configOption.comapeoCatInZip, {
        type: 'application/zip',
      });

      // Process the .comapeocat file
      onProgress?.(50, 'Processing extracted .comapeocat file...');
      return await extractZipFile(comapeoCatFile, (progress, message) => {
        // Map the extraction progress to 50-100% range
        const adjustedProgress = 50 + progress * 0.5;
        onProgress?.(adjustedProgress, message);
      });
    } else {
      // This is a direct .comapeocat file
      // Convert blob to File object
      const file = new File([blob], configOption.fileName, {
        type: 'application/zip',
      });

      // Use the existing extractZipFile function to process the file
      return await extractZipFile(file, (progress, message) => {
        // Map the extraction progress to 30-100% range
        const adjustedProgress = 30 + progress * 0.7;
        onProgress?.(adjustedProgress, message);
      });
    }
  } catch (error) {
    console.error('Error downloading default config:', error);
    throw error;
  }
}