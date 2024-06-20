let currentAudio = null;
let isPlaying = false;
let currentSongIndex = null; // Track the index of the currently playing song
let songs = [];
let shuffleMode = false;
let repeatMode = 'none';
let savedTime = 0;
let originalSongsOrder = [];
const loadingIndicator = document.getElementById('loading-indicator');
const masterPlayButton = document.getElementById('masterPlay');
const previousButton = document.getElementById('previous');
const nextButton = document.getElementById('next');
const progressBar = document.getElementById('myProgressBar')
const volumeControl = document.getElementById('volumeControl');
const shuffleIcon = document.getElementById('shuffleIcon');
const repeatIcon = document.getElementById('repeatIcon');
const masterSongName = document.getElementById('masterSongName');
const elapsedTime = document.getElementById('elapsedTime');
const durationTime = document.getElementById('durationTime');
const gif = document.getElementById('gif');
const volumeIcon = document.getElementById('volumeIcon');


function fetchAndCreateSongItems(albumName) {
    showLoadingIndicator();
    const jsonFileName = `/jsonfiles/${albumName.toLowerCase().replace("'", "").replace(/\s+/g, '')}.json`; // Update the file path to be relative
    fetch(jsonFileName)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch ${jsonFileName}`);
            }
            return response.json();
        })
        .then(data => {
            originalSongsOrder = data; // Store original order
            songs = data.map((song, index) => ({ ...song, index })); // Add index property to each song
            createSongItems();
            setupControlEventListeners();
            hideLoadingIndicator();

        })
        .catch(error => console.error(`Error fetching ${jsonFileName}:`, error));
    hideBottomControls();
}

// Function to extract album name from URL query parameter
function getAlbumNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('album');
}

// Example usage when the page loads
window.addEventListener('load', () => {
    const albumName = getAlbumNameFromURL();
    if (albumName) {
        fetchAndCreateSongItems(albumName);
    }
});

// Show the loading indicator when the song is loading
function showLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.classList.add('visible');
    }
}

// Hide the loading indicator when the song is loaded
function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.classList.remove('visible');
    }
}


function createSongItems() {
    const songContainer = document.querySelector('.songItemContainer');
    songs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.classList.add('songItem');
        songItem.dataset.index = index; // Set the dataset index attribute
        const songName = document.createElement('span');
        songName.textContent = `${song.songName}`;
        const coverImage = document.createElement('img');
        coverImage.src = song.coverPath;
        coverImage.alt = song.songName;
        coverImage.width = 40;
        songName.addEventListener('click', () => {
            playOrPauseSong(song, songItem);
        });
        songItem.appendChild(coverImage);
        songItem.appendChild(songName);
        songContainer.appendChild(songItem);
    });
}

function playOrPauseSong(song, songItem) {
    if (currentAudio && currentAudio.src === song.filePath) {
        if (isPlaying) {
            pauseAudio();
            gif.style.display = 'none';
            hideBottomControls();
        } else {
          
            playAudio();
            gif.style.display = 'block';
            updateSongItemClass(currentSongIndex);
            updateProgressAndTime(); // Update progress bar and elapsed time
            showLoadingIndicator();

        }
    } else {
        if (currentAudio) {
            pauseAudio();
        }
        currentAudio = new Audio(song.filePath);
        currentAudio.preload = 'auto';
        currentAudio.addEventListener('loadedmetadata', () => {
            hideLoadingIndicator();

            if (isPlaying) {
                // If the song is currently playing, resume from the saved time
                currentAudio.currentTime = savedTime;
                playAudio();
                gif.style.display = 'block';
            } else {
                // If the song is paused, start playing from the beginning
                playAudio();
                gif.style.display = 'none';
            }
            showBottomControls();
            currentSongIndex = song.index;
            updateSongItemClass(currentSongIndex);
            masterSongName.textContent = song.songName; // Set masterSongName to current song name

            // Update duration and elapsed time elements
            const durationFormatted = formatTime(currentAudio.duration);
            durationTime.textContent = durationFormatted;
            elapsedTime.textContent = '0:00'; // Reset elapsed time to 0 when loading a new song
           
            updateProgressAndTime(); // Update progress bar and elapsed time

            // Update the cover image in songInfo
            const songInfoCoverImage = document.querySelector('.songInfo img');
            songInfoCoverImage.src = song.coverPath;
        });

        // Update the isPlaying flag
        isPlaying = true;
        updateMasterPlayIcon();
    }
      
    // Update the progress bar value during play/pause
    currentAudio.addEventListener('timeupdate', () => {
        updateProgressAndTime(); // Update progress bar and elapsed time
    });
}


function showBottomControls() {
    const bottomControls = document.getElementById('bottom');
    bottomControls.classList.add('visible');
}

function hideBottomControls() {
    const bottomControls = document.getElementById('bottom');
    bottomControls.classList.remove('visible');
}

   
// Function to update the progress bar and elapsed time
function updateProgressAndTime() {
    const currentTime = currentAudio.currentTime;
    const duration = currentAudio.duration;
    const elapsed = formatTime(currentTime);
    const durationFormatted = formatTime(duration);

    // Update the progress bar value
    const progressBar = document.getElementById('myProgressBar');
    progressBar.value = (currentTime / duration) * 100;

    // Update the elapsed time and duration display
    const elapsedTime = document.getElementById('elapsedTime');
    elapsedTime.textContent = elapsed;

    const durationTime = document.getElementById('durationTime');
    durationTime.textContent = durationFormatted;
}

function playAudio() {
    currentAudio.play();
    isPlaying = true;
    gif.style.display = 'block';

}

function pauseAudio() {
    currentAudio.pause();
    isPlaying = false;
    gif.style.display = 'none';
    
}

function playNextSong() {
    let nextIndex;
    if (shuffleMode) {
        nextIndex = Math.floor(Math.random() * songs.length);
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
    updateProgressBar(0, 1);
    isPlaying = true;
    updateMasterPlayIcon();
}

function playPreviousSong() {
    let previousIndex;
    if (shuffleMode) {
        previousIndex = Math.floor(Math.random() * songs.length);
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
    updateProgressBar(0, 1);
    isPlaying = true;
    updateMasterPlayIcon();
}



function loadAndPlaySong(song, index) {
    if (currentAudio) {
      currentAudio.pause();
    }
    currentAudio = new Audio(song.filePath);
    currentAudio.preload = 'auto';
    currentAudio.addEventListener('loadedmetadata', function() {
      currentAudio.play();
      isPlaying = true;
      currentSongIndex = index;
      updateSongItemClass(index);
      updateDurationTime(currentAudio.duration);
    });
    currentAudio.addEventListener('timeupdate', function() {
      updateProgressBar(currentAudio.currentTime, currentAudio.duration);
      const currentTime = currentAudio.currentTime;
      const elapsed = formatTime(currentTime);
      elapsedTime.textContent = elapsed;
      masterSongName.textContent = song.songName;
      const durationFormatted = formatTime(currentAudio.duration);
      durationTime.textContent = durationFormatted;
    });
    currentAudio.addEventListener('ended', function() {
        console.log('Song ended');
      isPlaying = false;
      updateMasterPlayIcon();
      playNextSong();
    });
  }
  
  

function updateProgressBar(currentTime, duration) {
    const progressBar = document.getElementById('myProgressBar');
    progressBar.value = (currentTime / duration) * 100;
}

function toggleShuffleMode() {
    shuffleMode = !shuffleMode;
    const shuffleIcon = document.getElementById('shuffleIcon');
    if (shuffleMode) {
        shuffleSongs();
        shuffleIcon.classList.add('active');
        // Find the index of the current song in the shuffled array
        const currentSongFilePath = currentAudio ? currentAudio.src : null;
        currentSongIndex = currentSongFilePath ? songs.findIndex(song => song.filePath === currentSongFilePath) : null;
        updateSongItemClass(currentSongIndex);
    } else {
        songs = [...originalSongsOrder]; // Restore original order
        shuffleIcon.classList.remove('active');
        currentSongIndex = originalSongsOrder.findIndex(song => song.filePath === currentAudio.src);
        updateSongItemClass(currentSongIndex);
    }
}


function shuffleSongs() {
    // Shuffle songs array
    for (let i = songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songs[i], songs[j]] = [songs[j], songs[i]];
    }

    // Shuffle corresponding UI elements
    const songContainer = document.querySelector('.songItemContainer');
    const songItems = Array.from(songContainer.querySelectorAll('.songItem'));
    songItems.forEach(item => {
        songContainer.appendChild(item);
    });
}


function toggleRepeatMode() {
    const repeatIcon = document.getElementById('repeatIcon');
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
        repeatIcon.classList.remove('fa-reply-all');
        repeatIcon.classList.remove('fa-redo');
        repeatIcon.classList.add('fa-repeat'); // Add the initial repeat icon class
        repeatIcon.classList.remove('active');
        break;
      default:
        break;
    }
  }

// Define updateMasterPlayIcon and updateSongItemClass functions globally
function updateMasterPlayIcon() {
    const masterPlayButton = document.getElementById('masterPlay');
    if (isPlaying) {
        masterPlayButton.classList.remove('fa-play-circle');
        masterPlayButton.classList.add('fa-pause-circle');
    } else {
        masterPlayButton.classList.remove('fa-pause-circle');
        masterPlayButton.classList.add('fa-play-circle');
        
    }
}

function updateSongItemClass(currentIndex) {
    const songItems = document.querySelectorAll('.songItem');
    songItems.forEach((songItem, i) => {
        if (shuffleMode) {
            // If shuffle mode is active, highlight the currently playing song item
            songItem.classList.toggle('playing', i === currentIndex);
        } else {
            songItem.classList.toggle('playing', i === currentIndex && isPlaying);
        }
    });
}



  

function setupControlEventListeners() {
    const masterPlayButton = document.getElementById('masterPlay');
    const previousButton = document.getElementById('previous');
    const nextButton = document.getElementById('next');
    const progressBar = document.getElementById('myProgressBar')
    const volumeControl = document.getElementById('volumeControl');
    const shuffleIcon = document.getElementById('shuffleIcon');
    const repeatIcon = document.getElementById('repeatIcon');
    const masterSongName = document.getElementById('masterSongName');
    const elapsedTime = document.getElementById('elapsedTime');
    const durationTime = document.getElementById('durationTime');
    const gif = document.getElementById('gif');
    const volumeIcon = document.getElementById('volumeIcon');

    updateMasterPlayIcon();
   


    if (masterPlayButton) {
        masterPlayButton.addEventListener('click', function () {
          if (songs.length > 0) {
            if (isPlaying) {
              pauseAudio();
            } else {
              playAudio();
            }
            updateMasterPlayIcon();
          }
        });
      }
      if (nextButton) {
        nextButton.addEventListener('click', playNextSong);
      }
    

    if (previousButton) {
        previousButton.addEventListener('click', playPreviousSong);
      }
    
    
      if (shuffleIcon) {
        shuffleIcon.addEventListener('click', toggleShuffleMode);
      }
    
      if (repeatIcon) {
        repeatIcon.addEventListener('click', toggleRepeatMode);
      }
    

    volumeIcon.addEventListener('click', toggleMute)

    if (progressBar) {
        progressBar.addEventListener('input', function () {
          const seekTime = (progressBar.value / 100) * currentAudio.duration;
          currentAudio.currentTime = seekTime;
        });
      }
    
      if (volumeControl) {
        volumeControl.addEventListener('input', function () {
          volumeControl.classList.add('changing');
          currentAudio.volume = volumeControl.value / 100;
          updateVolumeIcon(volumeIcon, volumeControl.value);
        });
        volumeControl.addEventListener('mouseup', function () {
          volumeControl.classList.remove('changing');
        });
      }
   

      if (currentAudio) {
        currentAudio.addEventListener('loadedmetadata', function () {
          const durationFormatted = formatTime(currentAudio.duration);
          durationTime.textContent = durationFormatted;
        });
    
        currentAudio.addEventListener('timeupdate', function () {
          const currentTime = currentAudio.currentTime;
          const duration = currentAudio.duration;
          const elapsed = formatTime(currentTime);
          const durationFormatted = formatTime(duration);
          progressBar.value = (currentTime / duration) * 100;
          elapsedTime.textContent = elapsed;
          durationTime.textContent = durationFormatted;
        });
    
        currentAudio.addEventListener('ended', function () {
          isPlaying = false;
          updateMasterPlayIcon();
          playNextSong();
        });
      }
 }
    


// Function to update volume icon based on volume level
function updateVolumeIcon(volumeIcon, volumeLevel) {
    if (volumeLevel === 0) {
      volumeIcon.classList.remove('fa-volume-up');
      volumeIcon.classList.remove('fa-volume-down');
      volumeIcon.classList.add('fa-volume-mute');
    } else if (volumeLevel < 50) {
      volumeIcon.classList.remove('fa-volume-up');
      volumeIcon.classList.add('fa-volume-down');
      volumeIcon.classList.remove('fa-volume-mute');
    } else {
      volumeIcon.classList.add('fa-volume-up');
      volumeIcon.classList.remove('fa-volume-down');
      volumeIcon.classList.remove('fa-volume-mute');
    }
  }
  
// Function to toggle mute
function toggleMute() {
  if (currentAudio.muted) {
    currentAudio.muted = false;
  } else {
    currentAudio.muted = true;
  }
  updateVolumeIcon(volumeIcon, currentAudio.muted ? 0 : 50);
}

// Function to format time in mm:ss format
function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}


// Call the function to fetch and create song items when the page loads
window.addEventListener('load', () => {
    fetchAndCreateSongItems();
    setupControlEventListeners();
    showBottomControls();
    progressBar.value = 0;
});


