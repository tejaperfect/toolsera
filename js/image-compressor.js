document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const compressionOptions = document.getElementById('compressionOptions');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const previewArea = document.getElementById('previewArea');
    const startScreen = document.getElementById('startScreen');
    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalInfo = document.getElementById('originalInfo');
    const compressedInfo = document.getElementById('compressedInfo');
    const actionButtons = document.getElementById('actionButtons');
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const compressBtn = document.getElementById('compressBtn');
    const workflowSteps = document.getElementById('workflowSteps');
    const tooltipEl = document.getElementById('tooltip');
    
    // Sliders and their value displays
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const maxWidthSlider = document.getElementById('maxWidthSlider');
    const maxWidthValue = document.getElementById('maxWidthValue');
    const compressionLevelSlider = document.getElementById('compressionLevelSlider');
    const compressionLevelValue = document.getElementById('compressionLevelValue');
    
    // Format selector radio buttons
    const formatRadios = document.querySelectorAll('input[name="format"]');
    
    // Variables to store image data
    let originalImage = null;
    let compressedImageBlob = null;
    let fileName = '';
    let originalFileSize = 0;
    let targetSize = 0;
    let originalFile = null;
    
    // Set up tooltips
    const tooltipIcons = document.querySelectorAll('.tooltip-icon');
    tooltipIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function(e) {
            const tooltipText = this.getAttribute('data-tooltip');
            tooltipEl.textContent = tooltipText;
            
            // Position the tooltip
            const rect = this.getBoundingClientRect();
            tooltipEl.style.top = (rect.top - 40) + 'px';
            tooltipEl.style.left = (rect.left - tooltipEl.offsetWidth / 2 + this.offsetWidth / 2) + 'px';
            
            // Show the tooltip
            tooltipEl.classList.add('visible');
        });
        
        icon.addEventListener('mouseleave', function() {
            tooltipEl.classList.remove('visible');
        });
    });
    
    // Toggle advanced settings
    const toggleAdvanced = document.getElementById('toggleAdvanced');
    const advancedSettings = document.getElementById('advancedSettings');
    
    toggleAdvanced.addEventListener('click', function() {
        if (advancedSettings.style.display === 'none') {
            advancedSettings.style.display = 'block';
            toggleAdvanced.querySelector('.fa-chevron-down').classList.replace('fa-chevron-down', 'fa-chevron-up');
        } else {
            advancedSettings.style.display = 'none';
            toggleAdvanced.querySelector('.fa-chevron-up').classList.replace('fa-chevron-up', 'fa-chevron-down');
        }
    });
    
    // Update workflow step
    function updateWorkflowStep(step) {
        const steps = document.querySelectorAll('.workflow-step');
        steps.forEach(s => {
            const stepNum = parseInt(s.getAttribute('data-step'));
            s.classList.remove('active', 'completed');
            
            if (stepNum === step) {
                s.classList.add('active');
            } else if (stepNum < step) {
                s.classList.add('completed');
            }
        });
    }
    
    // Initialize sliders
    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = this.value + '%';
        if (originalImage) {
            compressImage();
        }
    });
    
    maxWidthSlider.addEventListener('input', function() {
        maxWidthValue.textContent = this.value + 'px';
        if (originalImage) {
            compressImage();
        }
    });
    
    compressionLevelSlider.addEventListener('input', function() {
        const level = this.value;
        compressionLevelValue.textContent = level + '%';
        
        // Calculate target file size based on compression level
        if (originalFileSize) {
            targetSize = originalFileSize * (1 - (level / 100));
            document.getElementById('targetSizeValue').textContent = formatFileSize(targetSize);
        }
        
        if (originalImage) {
            compressImage();
        }
    });
    
    // Format radio button change
    formatRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (originalImage) {
                compressImage();
            }
        });
    });
    
    // Handle drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('active');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        this.classList.remove('active');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    // Handle file input change
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFile(this.files[0]);
        }
    });
    
    // Click on upload area to trigger file input
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Try again button
    tryAgainBtn.addEventListener('click', function() {
        resetUI();
    });
    
    // Compress button
    compressBtn.addEventListener('click', function() {
        if (originalImage) {
            updateWorkflowStep(3);
            compressImage();
        }
    });
    
    // Download button
    downloadBtn.addEventListener('click', function() {
        if (compressedImageBlob) {
            // Update workflow step
            updateWorkflowStep(4);
            
            // Create download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(compressedImageBlob);
            
            // Get selected format
            const selectedFormat = document.querySelector('input[name="format"]:checked').value;
            
            // Extract file extension from selected format
            const extension = selectedFormat === 'jpeg' ? 'jpg' : selectedFormat;
            
            // Generate file name
            const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            const compressionLevel = compressionLevelSlider.value;
            link.download = `${fileNameWithoutExt}_compressed_${compressionLevel}pct.${extension}`;
            
            // Trigger download and clean up
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success toast
            showToast('Image successfully downloaded!');
        }
    });
    
    // Smart compression button
    document.getElementById('smartCompressBtn').addEventListener('click', function() {
        if (!originalImage) return;
        
        // Update workflow step
        updateWorkflowStep(3);
        
        // Try different quality settings to reach the target size
        document.getElementById('compressionStatus').style.display = 'block';
        
        let min = 0;
        let max = 100;
        let bestQuality = 0;
        let bestBlob = null;
        let attempts = 0;
        const maxAttempts = 10;
        
        const findOptimalQuality = function() {
            attempts++;
            if (attempts > maxAttempts) {
                // Use the best quality found so far
                if (bestBlob) {
                    updateCompressedPreview(bestBlob, bestQuality);
                }
                document.getElementById('compressionStatus').style.display = 'none';
                return;
            }
            
            const mid = Math.floor((min + max) / 2);
            qualitySlider.value = mid;
            qualityValue.textContent = mid + '%';
            
            // Update progress bar
            const progressPercentage = (attempts / maxAttempts) * 100;
            document.getElementById('compressionProgress').style.width = progressPercentage + '%';
            document.getElementById('attemptCounter').textContent = `Attempt ${attempts}/${maxAttempts}`;
            
            compressImageWithQuality(mid, function(blob) {
                if (blob.size <= targetSize) {
                    // Save this as a potential solution and try higher quality
                    if (mid > bestQuality) {
                        bestQuality = mid;
                        bestBlob = blob;
                    }
                    min = mid + 1;
                } else {
                    // Too big, try lower quality
                    max = mid - 1;
                }
                
                if (min <= max) {
                    setTimeout(findOptimalQuality, 50); // Small delay to update UI
                } else {
                    // We've found the optimal quality
                    if (bestBlob) {
                        updateCompressedPreview(bestBlob, bestQuality);
                    } else {
                        // If we couldn't find a solution, use the lowest quality
                        qualitySlider.value = 1;
                        qualityValue.textContent = '1%';
                        compressImage();
                    }
                    document.getElementById('compressionStatus').style.display = 'none';
                }
            });
        };
        
        findOptimalQuality();
    });
    
    function handleFile(file) {
        if (!file || !file.type.match('image.*')) {
            showToast('Please select a valid image file.', 'error');
            return;
        }
        
        // Check file size
        if (file.size > 20 * 1024 * 1024) { // 20MB
            showToast('File is too large. Maximum size is 20MB.', 'error');
            return;
        }
        
        // Store file info
        fileName = file.name;
        originalFile = file;
        originalFileSize = file.size;
        
        // Update UI for file processing
        uploadArea.style.display = 'none';
        startScreen.style.display = 'none';
        loadingIndicator.style.display = 'block';
        
        // Update workflow step
        updateWorkflowStep(2);
        
        // Create file reader to load image
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                originalImage = img;
                
                // Display compression options
                compressionOptions.style.display = 'block';
                loadingIndicator.style.display = 'none';
                
                // Set original image info
                document.getElementById('originalSizeValue').textContent = formatFileSize(originalFileSize);
                
                // Calculate target size based on current compression level
                const compressionLevel = compressionLevelSlider.value;
                targetSize = originalFileSize * (1 - (compressionLevel / 100));
                document.getElementById('targetSizeValue').textContent = formatFileSize(targetSize);
                
                // Initial compression
                compressImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function updateEstimatedDimensions() {
        if (!originalImage) return;
        
        const maxWidth = parseInt(maxWidthSlider.value);
        const originalWidth = originalImage.width;
        const originalHeight = originalImage.height;
        
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        
        if (originalWidth > maxWidth) {
            const ratio = maxWidth / originalWidth;
            newWidth = maxWidth;
            newHeight = originalHeight * ratio;
        }
        
        return {
            width: Math.round(newWidth),
            height: Math.round(newHeight)
        };
    }
    
    function compressImageWithQuality(quality, callback) {
        if (!originalImage) return;
        
        const canvas = document.createElement('canvas');
        const dimensions = updateEstimatedDimensions();
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
        
        // Get selected format
        const format = document.querySelector('input[name="format"]:checked').value;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
        
        // Convert to blob with specified quality
        canvas.toBlob(callback, mimeType, quality / 100);
    }
    
    function compressImage() {
        if (!originalImage) return;
        
        loadingIndicator.style.display = 'block';
        previewArea.style.display = 'none';
        
        const quality = parseInt(qualitySlider.value);
        
        compressImageWithQuality(quality, function(blob) {
            updateCompressedPreview(blob, quality);
        });
    }
    
    function updateCompressedPreview(blob, quality) {
        compressedImageBlob = blob;
        
        // Convert blob to data URL for display
        const reader = new FileReader();
        reader.onload = function(e) {
            // Display previews
            originalPreview.src = originalImage.src;
            compressedPreview.src = e.target.result;
            
            // Display file sizes
            const compressedSize = blob.size;
            document.getElementById('originalSizeDisplay').textContent = formatFileSize(originalFileSize);
            document.getElementById('compressedSizeDisplay').textContent = formatFileSize(compressedSize);
            
            // Calculate and display reduction percentage
            const reduction = calculateReduction(originalFileSize, compressedSize);
            document.getElementById('reductionPercentage').textContent = `${reduction}%`;
            document.getElementById('reductionLabel').textContent = `${reduction}% saved`;
            
            // Update visual progress bars
            const progressLeft = document.getElementById('progressLeft');
            const progressRight = document.getElementById('progressRight');
            const compressedPercentage = ((compressedSize / originalFileSize) * 100).toFixed(0);
            
            progressLeft.style.width = compressedPercentage + '%';
            progressRight.style.width = 'calc(100% - ' + compressedPercentage + '%)';
            
            // Update circle progress
            const circleProgress = document.getElementById('circleProgress');
            if (circleProgress) {
                circleProgress.setAttribute('stroke-dasharray', `${reduction}, 100`);
            }
            
            // Display image details
            originalInfo.innerHTML = `
                <div><strong>Format:</strong> ${originalFile.type.split('/')[1].toUpperCase()}</div>
                <div><strong>Size:</strong> ${formatFileSize(originalFileSize)}</div>
                <div><strong>Dimensions:</strong> ${originalImage.width} × ${originalImage.height}</div>
            `;
            
            const dimensions = updateEstimatedDimensions();
            compressedInfo.innerHTML = `
                <div><strong>Format:</strong> ${document.querySelector('input[name="format"]:checked').value.toUpperCase()}</div>
                <div><strong>Size:</strong> ${formatFileSize(compressedSize)}</div>
                <div><strong>Dimensions:</strong> ${dimensions.width} × ${dimensions.height}</div>
                <div><strong>Quality:</strong> ${quality}%</div>
            `;
            
            // Show preview area and hide loading indicator
            loadingIndicator.style.display = 'none';
            previewArea.style.display = 'block';
        };
        reader.readAsDataURL(blob);
    }
    
    function resetUI() {
        // Reset UI state
        uploadArea.style.display = 'block';
        compressionOptions.style.display = 'none';
        previewArea.style.display = 'none';
        startScreen.style.display = 'block';
        
        // Reset form values
        fileInput.value = '';
        qualitySlider.value = 80;
        qualityValue.textContent = '80%';
        compressionLevelSlider.value = 70;
        compressionLevelValue.textContent = '70%';
        maxWidthSlider.value = 1920;
        maxWidthValue.textContent = '1920px';
        document.getElementById('resizeToggle').checked = true;
        document.getElementById('metadataToggle').checked = true;
        document.getElementById('targetSizeValue').textContent = '0 KB';
        document.getElementById('originalSizeValue').textContent = '0 KB';
        
        // Reset image data
        originalImage = null;
        compressedImageBlob = null;
        fileName = '';
        originalFileSize = 0;
        targetSize = 0;
        originalFile = null;
        
        // Reset workflow step
        updateWorkflowStep(1);
    }
    
    function showToast(message, type = 'success') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Add to body
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function calculateReduction(originalSize, compressedSize) {
        const reduction = ((originalSize - compressedSize) / originalSize) * 100;
        return Math.round(reduction);
    }
    
    // Initialize UI
    resetUI();
}); 