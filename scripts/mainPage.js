/**
 * GrootMan Music Player - Enhanced version
 * Simple improvements to the original code structure
 */

// Player state variables
let currentAudio = null;
let isPlaying = false;
let currentSongIndex = null; 
let songs = [];
let shuffleMode = false;
let repeatMode = 'none';
let savedTime = 0;
let originalSongsOrder = [];

// Cache DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const masterPlayButton = document.getElementById('masterPlay');
const previousButton = document.getElementById('previous');
const nextButton = document.getElementById('next');
const progressBar = document.getElementById('myProgressBar');
const volumeControl = document.getElementById('volumeControl');
const shuffleIcon = document.getElementById('shuffleIcon');
const repeatIcon = document.getElementById('repeatIcon');
const masterSongName = document.getElementById('masterSongName');
const elapsedTime = document.getElementById('elapsedTime');
const durationTime = document.getElementById('durationTime');
const gif = document.getElementById('gif');
const volumeIcon = document.getElementById('volumeIcon');
const bottomControls = document.getElementById('bottom');

/**
 * Fetch songs and create song items based on album name
 */
function fetchAndCreateSongItems(albumName) {
    showLoadingIndicator();
    const jsonFileName = albumName ? 
        `/jsonfiles/${albumName.toLowerCase().replace(/['\s]+/g, '')}.json` : 
        '/jsonfiles/default.json';
    
    fetch(jsonFileName)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch ${jsonFileName}`);
            }
            return response.json();
        })
        .then(data => {
            originalSongsOrder = [...data]; // Store original order
            songs = data.map((song, index) => ({ ...song, index })); // Add index property to each song
            createSongItems();
            setupControlEventListeners();
            hideLoadingIndicator();
        })
        .catch(error => {
            console.error(`Error fetching ${jsonFileName}:`, error);
            hideLoadingIndicator();
            
            // Show error message to user
            const songContainer = document.querySelector('.songItemContainer');
            if (songContainer) {
                songContainer.innerHTML = `
                    <div class="error-message">
                        <p>Failed to load songs. Please try again later.</p>
                    </div>
                `;
            }
        });
    hideBottomControls();
}

/**
 * Extract album name from URL query parameter
 */
function getAlbumNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('album');
}

/**
 * UI Loading indicator functions
 */
function showLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.classList.add('visible');
    }
}

function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.classList.remove('visible');
    }
}

/**
 * Bottom controls visibility functions
 */
function showBottomControls() {
    if (bottomControls) {
        bottomControls.classList.add('visible');
        bottomControls.classList.remove('hidden');
    }
}

function hideBottomControls() {
    if (bottomControls) {
        bottomControls.classList.remove('visible');
        bottomControls.classList.add('hidden');
    }
}

/**
 * Create song items in the UI
 */
function createSongItems() {
    const songContainer = document.querySelector('.songItemContainer');
    if (!songContainer) return;
    
    // Clear existing content
    songContainer.innerHTML = '';
    
    songs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.classList.add('songItem');
        songItem.dataset.index = index;
        
        const coverImage = document.createElement('img');
        coverImage.src = song.coverPath;
        coverImage.alt = song.songName;
        coverImage.width = 40;
        coverImage.onerror = () => {
            // Fallback image if cover fails to load
            coverImage.src = '/images/default-cover.png';
        };
        
        const songName = document.createElement('span');
        songName.textContent = song.songName;
        songName.title = song.songName; // Add tooltip
        
        // Add click event to play song
        songItem.addEventListener('click', () => {
            playOrPauseSong(song, songItem);
        });
        
        songItem.appendChild(coverImage);
        songItem.appendChild(songName);
        songContainer.appendChild(songItem);
    });
}

/**
 * Play or pause a song
 */
function playOrPauseSong(song, songItem) {
    // Check if the same song is already loaded
    if (currentAudio && currentAudio.src === song.filePath) {
        if (isPlaying) {
            pauseAudio();
            gif.style.display = 'none';
        } else {
            playAudio();
            gif.style.display = 'block';
            updateSongItemClass(currentSongIndex);
            updateProgressAndTime();
        }
    } else {
        // Load a new song
        if (currentAudio) {
            pauseAudio();
            // Save current time for potential resume
            savedTime = currentAudio.currentTime;
        }
        
        showLoadingIndicator();
        currentAudio = new Audio(song.filePath);
        currentAudio.preload = 'auto';
        
        // Set volume from existing control
        if (volumeControl) {
            currentAudio.volume = volumeControl.value / 100;
        }
        
        currentAudio.addEventListener('loadedmetadata', () => {
            hideLoadingIndicator();
            playAudio();
            gif.style.display = 'block';
            showBottomControls();
            
            currentSongIndex = song.index;
            updateSongItemClass(currentSongIndex);
            masterSongName.textContent = song.songName;
            
            // Update duration and elapsed time elements
            updateDurationDisplay(currentAudio.duration);
            elapsedTime.textContent = '0:00';
            updateProgressAndTime();
            
            // Update the cover image in songInfo
            const songInfoCoverImage = document.querySelector('.songInfo img');
            if (songInfoCoverImage) {
                songInfoCoverImage.src = song.coverPath;
            }
        });
        
        currentAudio.addEventListener('error', () => {
            hideLoadingIndicator();
            alert(`Failed to load the song: ${song.songName}`);
        });
        
        // Set time update listener for progress bar
        currentAudio.addEventListener('timeupdate', updateProgressAndTime);
        
        // Set ended listener to play next song
        currentAudio.addEventListener('ended', () => {
            isPlaying = false;
            updateMasterPlayIcon();
            playNextSong();
        });
    }
}

/**
 * Audio control functions
 */
function playAudio() {
    if (!currentAudio) return;
    
    const playPromise = currentAudio.play();
    
    // Handle play promise to avoid uncaught promise rejection
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error('Play error:', error);
            // Auto-retry play on user interaction error
            document.addEventListener('click', function retryPlay() {
                currentAudio.play();
                document.removeEventListener('click', retryPlay);
            }, { once: true });
        });
    }
    
    isPlaying = true;
    gif.style.display = 'block';
    updateMasterPlayIcon();
}

function pauseAudio() {
    if (!currentAudio) return;
    
    currentAudio.pause();
    isPlaying = false;
    gif.style.display = 'none';
    updateMasterPlayIcon();
}

/**
 * Play next song based on current modes
 */
function playNextSong() {
    if (!songs.length) return;
    
    let nextIndex;
    
    if (shuffleMode) {
        // Generate random index (avoid current song if possible)
        do {
            nextIndex = Math.floor(Math.random() * songs.length);
        } while (songs.length > 1 && nextIndex === currentSongIndex);
    } else {
        switch (repeatMode) {
            case 'none':
                nextIndex = (currentSongIndex + 1) % songs.length;
                break;
            case 'one':
                nextIndex = currentSongIndex;
                break;
            case 'all':
                nextIndex = (currentSongIndex + 1) % songs.length;
                break;
            default:
                nextIndex = (currentSongIndex + 1) % songs.length;
                break;
        }
    }
    
    const nextSong = songs[nextIndex];
    loadAndPlaySong(nextSong, nextIndex);
}

/**
 * Play previous song based on current modes
 */
function playPreviousSong() {
    if (!songs.length) return;
    
    // If we're more than 3 seconds into a song, restart it instead
    if (currentAudio && currentAudio.currentTime > 3) {
        currentAudio.currentTime = 0;
        return;
    }
    
    let previousIndex;
    
    if (shuffleMode) {
        // Generate random index (avoid current song if possible)
        do {
            previousIndex = Math.floor(Math.random() * songs.length);
        } while (songs.length > 1 && previousIndex === currentSongIndex);
    } else {
        switch (repeatMode) {
            case 'none':
                previousIndex = (currentSongIndex - 1 + songs.length) % songs.length;
                break;
            case 'one':
                previousIndex = currentSongIndex;
                break;
            case 'all':
                previousIndex = (currentSongIndex - 1 + songs.length) % songs.length;
                break;
            default:
                previousIndex = (currentSongIndex - 1 + songs.length) % songs.length;
                break;
        }
    }
    
    const previousSong = songs[previousIndex];
    loadAndPlaySong(previousSong, previousIndex);
}

/**
 * Load and play a song
 */
function loadAndPlaySong(song, index) {
    if (!song) return;
    
    if (currentAudio) {
        currentAudio.pause();
        // Remove old event listeners to prevent memory leaks
        currentAudio.onloadedmetadata = null;
        currentAudio.ontimeupdate = null;
        currentAudio.onended = null;
        currentAudio.onerror = null;
    }
    
    showLoadingIndicator();
    currentAudio = new Audio(song.filePath);
    currentAudio.preload = 'auto';
    
    // Set volume
    if (volumeControl) {
        currentAudio.volume = volumeControl.value / 100;
    }
    
    currentAudio.addEventListener('loadedmetadata', function() {
        hideLoadingIndicator();
        currentAudio.play()
            .catch(error => {
                console.error('Play error:', error);
            });
        
        isPlaying = true;
        currentSongIndex = index;
        updateSongItemClass(index);
        updateDurationDisplay(currentAudio.duration);
        masterSongName.textContent = song.songName;
        
        // Update the cover image in songInfo
        const songInfoCoverImage = document.querySelector('.songInfo img');
        if (songInfoCoverImage) {
            songInfoCoverImage.src = song.coverPath;
        }
        
        // Show gif indicator
        gif.style.display = 'block';
        updateMasterPlayIcon();
    });
    
    currentAudio.addEventListener('timeupdate', function() {
        updateProgressBar(currentAudio.currentTime, currentAudio.duration);
        const elapsed = formatTime(currentAudio.currentTime);
        elapsedTime.textContent = elapsed;
    });
    
    currentAudio.addEventListener('ended', function() {
        isPlaying = false;
        updateMasterPlayIcon();
        playNextSong();
    });
    
    currentAudio.addEventListener('error', function() {
        hideLoadingIndicator();
        alert(`Failed to load song: ${song.songName}`);
    });
}

/**
 * Update UI elements
 */
function updateProgressBar(currentTime, duration) {
    if (!progressBar || !duration) return;
    progressBar.value = (currentTime / duration) * 100;
}

function updateProgressAndTime() {
    if (!currentAudio) return;
    
    const currentTime = currentAudio.currentTime;
    const duration = currentAudio.duration;
    
    if (isNaN(duration)) return;
    
    // Update progress bar
    updateProgressBar(currentTime, duration);
    
    // Update time displays
    const elapsed = formatTime(currentTime);
    elapsedTime.textContent = elapsed;
    
    // Only update duration if not already set
    if (!durationTime.textContent || durationTime.textContent === "0:00") {
        updateDurationDisplay(duration);
    }
}

function updateDurationDisplay(duration) {
    if (!durationTime || isNaN(duration)) return;
    const durationFormatted = formatTime(duration);
    durationTime.textContent = durationFormatted;
}

function updateMasterPlayIcon() {
    if (!masterPlayButton) return;
    
    if (isPlaying) {
        masterPlayButton.classList.remove('fa-play-circle', 'fa-circle-play');
        masterPlayButton.classList.add('fa-pause-circle');
    } else {
        masterPlayButton.classList.remove('fa-pause-circle');
        masterPlayButton.classList.add('fa-play-circle', 'fa-circle-play');
    }
}

function updateSongItemClass(currentIndex) {
    const songItems = document.querySelectorAll('.songItem');
    
    songItems.forEach((songItem, i) => {
        if (i === currentIndex && isPlaying) {
            songItem.classList.add('playing');
        } else {
            songItem.classList.remove('playing');
        }
    });
}

/**
 * Toggle shuffle mode
 */
function toggleShuffleMode() {
    shuffleMode = !shuffleMode;
    
    if (!shuffleIcon) return;
    
    if (shuffleMode) {
        // Save current song before shuffling
        const currentSong = currentSongIndex !== null ? songs[currentSongIndex] : null;
        
        // Shuffle songs
        shuffleSongs();
        
        // Find current song in shuffled list
        if (currentSong) {
            currentSongIndex = songs.findIndex(song => song.filePath === currentSong.filePath);
        }
        
        shuffleIcon.classList.add('active');
    } else {
        // Save current song before reverting
        const currentSongFilePath = currentSongIndex !== null ? songs[currentSongIndex].filePath : null;
        
        // Restore original order
        songs = [...originalSongsOrder].map((song, index) => ({ ...song, index }));
        
        // Find current song in original list
        if (currentSongFilePath) {
            currentSongIndex = songs.findIndex(song => song.filePath === currentSongFilePath);
        }
        
        shuffleIcon.classList.remove('active');
    }
    
    // Refresh song list in the UI
    createSongItems();
    updateSongItemClass(currentSongIndex);
}

/**
 * Shuffle songs using Fisher-Yates algorithm
 */
function shuffleSongs() {
    // Create a copy to avoid directly modifying the original
    const shuffledSongs = [...songs];
    
    // Fisher-Yates shuffle
    for (let i = shuffledSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
    }
    
    // Reassign indices
    songs = shuffledSongs.map((song, index) => ({ ...song, index }));
}

/**
 * Toggle repeat mode
 */
function toggleRepeatMode() {
    if (!repeatIcon) return;
    
    switch (repeatMode) {
        case 'none':
            repeatMode = 'one';
            repeatIcon.classList.remove('fa-repeat');
            repeatIcon.classList.add('fa-redo');
            repeatIcon.classList.add('active');
            break;
        case 'one':
            repeatMode = 'all';
            repeatIcon.classList.remove('fa-redo');
            repeatIcon.classList.add('fa-reply-all');
            repeatIcon.classList.add('active');
            break;
        case 'all':
            repeatMode = 'none';
            repeatIcon.classList.remove('fa-reply-all', 'fa-redo');
            repeatIcon.classList.add('fa-repeat');
            repeatIcon.classList.remove('active');
            break;
    }
}

/**
 * Toggle mute
 */
function toggleMute() {
    if (!currentAudio || !volumeIcon) return;
    
    currentAudio.muted = !currentAudio.muted;
    updateVolumeIcon(volumeIcon, currentAudio.muted ? 0 : volumeControl.value);
}

/**
 * Update volume icon based on level
 */
function updateVolumeIcon(volumeIcon, volumeLevel) {
    if (!volumeIcon) return;
    
    // Remove all volume classes
    volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down', 'fa-volume-mute');
    
    // Add the appropriate class
    if (volumeLevel === 0) {
        volumeIcon.classList.add('fa-volume-mute');
    } else if (volumeLevel < 50) {
        volumeIcon.classList.add('fa-volume-down');
    } else {
        volumeIcon.classList.add('fa-volume-up');
    }
}

/**
 * Format time in mm:ss format
 */
function formatTime(time) {
    if (isNaN(time) || time === Infinity) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Setup all control event listeners
 */
function setupControlEventListeners() {
    // Master play button
    if (masterPlayButton) {
        masterPlayButton.addEventListener('click', function() {
            if (songs.length === 0) return;
            
            // If no song is selected, play the first song
            if (currentSongIndex === null && songs.length > 0) {
                playOrPauseSong(songs[0]);
                return;
            }
            
            if (isPlaying) {
                pauseAudio();
            } else {
                playAudio();
            }
        });
    }
    
    // Next button
    if (nextButton) {
        nextButton.addEventListener('click', playNextSong);
    }
    
    // Previous button
    if (previousButton) {
        previousButton.addEventListener('click', playPreviousSong);
    }
    
    // Shuffle icon
    if (shuffleIcon) {
        shuffleIcon.addEventListener('click', toggleShuffleMode);
    }
    
    // Repeat icon
    if (repeatIcon) {
        repeatIcon.addEventListener('click', toggleRepeatMode);
    }
    
    // Volume icon (mute/unmute)
    if (volumeIcon) {
        volumeIcon.addEventListener('click', toggleMute);
    }
    
    // Progress bar
    if (progressBar) {
        progressBar.addEventListener('input', function() {
            if (!currentAudio || !currentAudio.duration) return;
            
            const seekTime = (progressBar.value / 100) * currentAudio.duration;
            currentAudio.currentTime = seekTime;
        });
    }
    
    // Volume control
    if (volumeControl) {
        // Set initial volume
        volumeControl.value = 75; // Default volume 75%
        
        volumeControl.addEventListener('input', function() {
            if (!currentAudio) return;
            
            volumeControl.classList.add('changing');
            currentAudio.volume = volumeControl.value / 100;
            updateVolumeIcon(volumeIcon, volumeControl.value);
        });
        
        volumeControl.addEventListener('mouseup', function() {
            volumeControl.classList.remove('changing');
        });
        
        volumeControl.addEventListener('touchend', function() {
            volumeControl.classList.remove('changing');
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ignore if user is typing in an input field
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.key) {
            case ' ': // Space
                e.preventDefault(); // Prevent page scroll
                if (isPlaying) {
                    pauseAudio();
                } else {
                    playAudio();
                }
                break;
                
            case 'ArrowRight': // Right arrow
                playNextSong();
                break;
                
            case 'ArrowLeft': // Left arrow
                playPreviousSong();
                break;
                
            case 'm': // M key
            case 'M':
                toggleMute();
                break;
        }
    });
}

// Initialize the player
window.addEventListener('load', () => {
    const albumName = getAlbumNameFromURL();
    fetchAndCreateSongItems(albumName);
    
    // Set initial state for controls
    if (volumeControl) {
        volumeControl.value = 75; // Default volume 75%
    }
    
    if (progressBar) {
        progressBar.value = 0;
    }
    
    // Initial UI state
    updateMasterPlayIcon();
});