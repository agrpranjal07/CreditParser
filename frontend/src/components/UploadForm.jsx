import { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { uploadReport } from '../api/creditReports';
import { validateFile } from '../utils/helpers';

const UploadForm = ({ onUploadSuccess, onUploadError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Validate & set file
  const handleFileSelect = (file) => {
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.isValid) {
      onUploadError?.(validation.error);
      return;
    }

    setSelectedFile(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Upload logic
  const handleUpload = async () => {
    if (!selectedFile) {
      onUploadError?.('Please select a file first');
      return;
    }


    try {
      setIsUploading(true);
      setUploadProgress(0);

      const response = await uploadReport(selectedFile, setUploadProgress);


      // Reset state
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onUploadSuccess?.(response.data);
    } catch (error) {
      onUploadError?.(error?.response?.data?.error || error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Upload Credit Report
        </h2>

        {/* Upload Area */}
        <div
          className={`upload-area border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
            dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-lg font-medium text-gray-900">
              Drop your XML file here, or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports XML files up to 10MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="text-red-600 hover:text-red-800 font-medium"
                disabled={isUploading}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 mr-2"></div>
                Processing...
              </div>
            ) : (
              'Upload & Process'
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Instructions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Upload a valid Experian credit report XML file</li>
            <li>• File size should be less than 10MB</li>
            <li>• Only XML format is supported</li>
            <li>• Processing may take a few moments</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadForm;
