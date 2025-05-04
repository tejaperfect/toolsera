const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseButton = document.getElementById('browseButton');
const previewArea = document.getElementById('previewArea');
const imagePreview = document.getElementById('imagePreview');
const originalSizeSpan = document.getElementById('originalSize');
const settingsArea = document.getElementById('settingsArea');
const qualityRange = document.getElementById('qualityRange');
const qualityValueSpan = document.getElementById('qualityValue');
const maxWidthInput = document.getElementById('maxWidth');
const maxHeightInput = document.getElementById('maxHeight');
const compressButton = document.getElementById('compressButton');
const resultArea = document.getElementById('resultArea');
const compressedPreview = document.getElementById('compressedPreview');
const compressedSizeSpan = document.getElementById('compressedSize');
const reductionPercentageSpan = document.getElementById('reductionPercentage');
const downloadLink = document.getElementById('downloadLink');
const compressionPercentageRange = document.getElementById('compressionPercentageRange');
const compressionPercentageValue = document.getElementById('compressionPercentageValue');

let originalFile = null;
let originalFileSize = 0;

// --- Event Listeners ---

browseButton.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

qualityRange.addEventListener('input', () => {
    qualityValueSpan.textContent = qualityRange.value;
});

compressionPercentageRange.addEventListener('input', () => {
    compressionPercentageValue.textContent = compressionPercentageRange.value;
});

compressButton.addEventListener('click', compressImage);

// --- Functions ---

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    originalFile = file;
    originalFileSize = file.size;

    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        originalSizeSpan.textContent = formatFileSize(originalFileSize);
        
        // Hide result area first if visible
        if (resultArea.style.display !== 'none') {
            resultArea.style.opacity = '0';
            setTimeout(() => {
                resultArea.style.display = 'none';
            }, 300);
        }
        
        // Show preview and settings with animation
        previewArea.style.display = 'block';
        previewArea.style.opacity = '0';
        previewArea.style.transform = 'translateY(20px)';
        
        settingsArea.style.display = 'block';
        settingsArea.style.opacity = '0';
        settingsArea.style.transform = 'translateY(20px)';
        
        // Trigger animation after a small delay
        setTimeout(() => {
            previewArea.style.opacity = '1';
            previewArea.style.transform = 'translateY(0)';
            
            setTimeout(() => {
                settingsArea.style.opacity = '1';
                settingsArea.style.transform = 'translateY(0)';
            }, 150);
        }, 50);
    };
    reader.readAsDataURL(file);
}

async function compressImage() {
    if (!originalFile) {
        alert('Please select an image first.');
        return;
    }

    const compressionPercentage = parseInt(compressionPercentageRange.value);
    const targetSizeMB = originalFileSize * (1 - compressionPercentage / 100) / (1024 * 1024);

    // Ensure targetSizeMB is not extremely small, maybe set a minimum?
    // For now, let's proceed, but browser-image-compression might have its own lower bounds.

    const options = {
        maxSizeMB: targetSizeMB > 0.01 ? targetSizeMB : 0.01, // Use calculated target size, ensure minimum
        maxWidthOrHeight: Math.max(parseInt(maxWidthInput.value) || 1920, parseInt(maxHeightInput.value) || 1080),
        initialQuality: parseFloat(qualityRange.value),
        useWebWorker: true,
        onProgress: (progress) => { 
            console.log(`Compression Progress: ${progress}%`);
        }
    };

    console.log('Compression options:', options);
    console.log('Original file:', originalFile);

    try {
        // Save the original button content
        const originalButtonHTML = compressButton.innerHTML;
        // Add loading animation
        compressButton.innerHTML = '<i class="fas fa-spinner"></i> Compressing...';
        compressButton.classList.add('loading');
        compressButton.disabled = true;

        const compressedFile = await imageCompression(originalFile, options);

        console.log('Original file size:', formatFileSize(originalFileSize));
        console.log('Compressed file size:', formatFileSize(compressedFile.size));

        const compressedReader = new FileReader();
        compressedReader.onload = (e) => {
            compressedPreview.src = e.target.result;
            compressedSizeSpan.textContent = formatFileSize(compressedFile.size);
            const reduction = 100 - (compressedFile.size / originalFileSize * 100);
            reductionPercentageSpan.textContent = reduction.toFixed(1);
            
            // Set download link
            const objectURL = URL.createObjectURL(compressedFile);
            downloadLink.href = objectURL;
            // Set a more specific download filename if possible
            const originalName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
            const extension = compressedFile.type.split('/')[1] || 'jpg'; // Get extension from MIME type
            downloadLink.download = `${originalName}_compressed.${extension}`;

            // Show result with animation
            resultArea.style.display = 'block';
            resultArea.style.opacity = '0';
            resultArea.style.transform = 'translateY(20px)';
            
            // Trigger animation after a small delay
            setTimeout(() => {
                resultArea.style.opacity = '1';
                resultArea.style.transform = 'translateY(0)';
                resultArea.classList.add('success-animation');
                // Scroll to results
                resultArea.scrollIntoView({ behavior: 'smooth' });
                
                // Remove the animation class after it completes
                setTimeout(() => {
                    resultArea.classList.remove('success-animation');
                }, 1500);
            }, 300);
        };
        compressedReader.readAsDataURL(compressedFile);

    } catch (error) {
        console.error('Compression Error:', error);
        alert(`Compression failed: ${error.message}`);
    } finally {
        // Restore button state
        compressButton.innerHTML = '<i class="fas fa-magic"></i> Compress Image';
        compressButton.classList.remove('loading');
        compressButton.disabled = false;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
