import { v2 as cloudinary } from 'cloudinary';

// Lazy initialization of Cloudinary config
let isConfigured = false;

const configureCloudinary = () => {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    isConfigured = true;
  }
  return cloudinary;
};

/**
 * Upload raw XML file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} fileName - Original filename
 * @returns {Promise<Object>} Upload result
 */
const uploadXmlFile = async (filePath, fileName) => {
  try {
    const cloudinaryInstance = configureCloudinary();
    const result = await cloudinaryInstance.uploader.upload(filePath, {
      resource_type: 'raw',
      public_id: `credit-reports/${Date.now()}-${fileName}`,
      use_filename: true,
      unique_filename: true,
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteXmlFile = async (publicId) => {
  try {
    const cloudinaryInstance = configureCloudinary();
    const result = await cloudinaryInstance.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary deletion failed: ${error.message}`);
  }
};

export {
  uploadXmlFile,
  deleteXmlFile,
  cloudinary,
};
