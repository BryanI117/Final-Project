document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const interactivePrompt = document.getElementById('interactivePrompt');
    const mainContent = document.getElementById('mainContent');
    const loadingSunOrMoon = document.getElementById('loadingSunOrMoon');
    const starsContainer = document.getElementById('starsContainer');
    const loadingClouds = [
        document.getElementById('loadingCloud1'),
        document.getElementById('loadingCloud2'),
        document.getElementById('loadingCloud3')
    ].filter(el => el !== null);

    const entryForm = document.getElementById('entryForm');
    const entryTextarea = document.getElementById('entryText');
    const formMessage = document.getElementById('formMessage');
    const inputStamp = document.getElementById('inputStamp');
    const stampSelector = document.getElementById('stampSelector');
    let selectedStampClass = 'fa-sun text-yellow-400';

    const postcardsContainer = document.getElementById('postcardsContainer');
    const loadingEntriesMsg = document.getElementById('loadingEntries');
    const noEntriesMessage = document.getElementById('noEntriesMessage');
    const surpriseMeBtn = document.getElementById('surpriseMeBtn');
    const entriesCounter = document.getElementById('entriesCounter');

    const postcardFocusModal = document.getElementById('postcardFocusModal');
    const focusModalContent = document.getElementById('focusModalContent');
    const closeFocusModalBtn = document.getElementById('closeFocusModalBtn');

    const messageInABottleContainer = document.getElementById('messageInABottleContainer');
    const messageBottleImg = document.getElementById('messageBottleImg');

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const returnToBoardwalkBtn = document.getElementById('returnToBoardwalkBtn');


    const API_BASE_URL = '/api/entries';
    let allEntriesCache = [];
    let currentTheme = localStorage.getItem('boardwalkTheme') || 'day';
    let hideLoadingScreenCalled = false;


    function applyTheme(theme) {
        document.body.classList.remove('day-mode', 'night-mode');
        document.body.classList.add(theme + '-mode');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = theme === 'day' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
        if (loadingSunOrMoon) {
            loadingSunOrMoon.className = theme === 'day' ? 'sun' : 'moon';
        }
        const bottlePath = messageBottleImg ? messageBottleImg.querySelector('.bottle-path') : null;
        if (bottlePath) {
             bottlePath.style.fill = theme === 'day' ? 'url(#bottleGradDay)' : 'url(#bottleGradNight)';
        }
        localStorage.setItem('boardwalkTheme', theme);
        currentTheme = theme;
        if (theme === 'night' && starsContainer) {
            createStars();
        } else if (starsContainer) {
            starsContainer.innerHTML = '';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'day' ? 'night' : 'day';
            applyTheme(currentTheme);
        });
    }
    applyTheme(currentTheme);

    function createStars() {
        if (!starsContainer) return;
        starsContainer.innerHTML = '';
        const numberOfStars = 100;
        for (let i = 0; i < numberOfStars; i++) {
            const star = document.createElement('div');
            star.classList.add('star');
            star.style.width = `${Math.random() * 2 + 1}px`;
            star.style.height = star.style.width;
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 2}s`;
            starsContainer.appendChild(star);
        }
    }

    function handleLoadingScreenMouseMove(e) {
        if (!loadingScreen || loadingScreen.classList.contains('hidden-screen')) return;
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const moveX = (clientX - innerWidth / 2) / (innerWidth / 2);
        const moveY = (clientY - innerHeight / 2) / (innerHeight / 2);

        if (loadingSunOrMoon) {
            requestAnimationFrame(() => {
                const sunMoveX = moveX * -20;
                const sunMoveY = moveY * -10;
                const baseTransform = loadingSunOrMoon.classList.contains('sun') ? 'translateX(-50%)' : 'translateX(-50%)';
                loadingSunOrMoon.style.transform = `${baseTransform} translateX(${sunMoveX}px) translateY(${sunMoveY}px)`;
            });
        }
        loadingClouds.forEach((cloud, index) => {
            if (cloud) {
                const cloudMoveFactorX = 20 + index * 10;
                const cloudMoveFactorY = (20 + index * 10) * 0.5;
                requestAnimationFrame(() => {
                    cloud.style.transform = `translateX(${moveX * cloudMoveFactorX}px) translateY(${moveY * cloudMoveFactorY}px)`;
                });
            }
        });
    }
    if (loadingScreen && !loadingScreen.classList.contains('hidden-screen')) {
       loadingScreen.addEventListener('mousemove', handleLoadingScreenMouseMove);
    }

    function showLoadingScreen() {
        if (!loadingScreen) return;
        hideLoadingScreenCalled = false;
        document.body.classList.add('overflow-hidden');
        loadingScreen.style.display = 'flex';
        setTimeout(() => {
            loadingScreen.classList.remove('hidden-screen');
        }, 10); // Small delay for transition
        if (!keydownListenerAddedToDocumentForShow) { // Re-add if it was removed
            document.addEventListener('keydown', handleDocumentKeydownForShow);
            keydownListenerAddedToDocumentForShow = true;
        }
         if (loadingScreen && !loadingScreen.classList.contains('hidden-screen')) {
            loadingScreen.addEventListener('mousemove', handleLoadingScreenMouseMove);
        }
    }

    function hideLoadingScreen() {
        if (hideLoadingScreenCalled || !loadingScreen || loadingScreen.classList.contains('hidden-screen')) {
            return;
        }
        hideLoadingScreenCalled = true;

        loadingScreen.classList.add('hidden-screen');
        if (loadingScreen) loadingScreen.removeEventListener('mousemove', handleLoadingScreenMouseMove);
        document.removeEventListener('keydown', handleDocumentKeydownForShow); // Remove this specific listener
        keydownListenerAddedToDocumentForShow = false;


        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            if (mainContent) {
                mainContent.classList.remove('hidden');
                document.body.classList.remove('overflow-hidden');
                setTimeout(() => {
                    if(mainContent) mainContent.classList.add('visible');
                }, 50);
            }
            fetchAndDisplayRecentEntries();
        }, 1000);
    }

    if (interactivePrompt) {
        interactivePrompt.addEventListener('click', hideLoadingScreen);
    }

    let keydownListenerAddedToDocumentForShow = false;
    function handleDocumentKeydownForShow(event) {
        if (!keydownListenerAddedToDocumentForShow) return; // Should only fire if listener is active
        hideLoadingScreen();
    }
    document.addEventListener('keydown', handleDocumentKeydownForShow);
    keydownListenerAddedToDocumentForShow = true; // Initially true for the first load

    if(returnToBoardwalkBtn) {
        returnToBoardwalkBtn.addEventListener('click', () => {
            if(mainContent) {
                mainContent.classList.remove('visible');
                setTimeout(() => {
                    mainContent.classList.add('hidden');
                    showLoadingScreen();
                }, 500); // allow fade out
            }
        });
    }


    if (entryTextarea && inputStamp) {
        entryTextarea.addEventListener('input', () => {
            if (!inputStamp.classList.contains('wiggle')) {
                inputStamp.classList.add('wiggle');
                setTimeout(() => inputStamp.classList.remove('wiggle'), 500);
            }
        });
    }

    if (stampSelector) {
        const stampChoices = stampSelector.querySelectorAll('.stamp-choice');
        stampChoices.forEach(choice => {
            choice.addEventListener('click', () => {
                stampChoices.forEach(c => c.classList.remove('selected-stamp'));
                choice.classList.add('selected-stamp');
                selectedStampClass = choice.dataset.stampClass;
                if (inputStamp) {
                    inputStamp.className = `fas ${selectedStampClass} postcard-stamp text-6xl`;
                    inputStamp.style.transition = 'transform 0.15s ease-out';
                    inputStamp.style.transform = 'rotate(12deg) scale(1.2)';
                    setTimeout(() => { inputStamp.style.transform = 'rotate(12deg) scale(0.9)';}, 150);
                }
            });
        });
    }

    function showUserMessage(message, isError = false) {
        if (!formMessage) return;
        formMessage.textContent = message;
        formMessage.className = `mt-4 text-md text-center ${isError ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}`;
        setTimeout(() => { formMessage.textContent = ''; }, 4000);
    }

    function showFocusModal(entryData) {
        if (!postcardFocusModal || !focusModalContent) return;
        const displayStamp = entryData.userStampClass || 'fa-sun text-yellow-400';

        focusModalContent.innerHTML = `
            <i class="fas ${displayStamp} postcard-item-stamp text-4xl" style="opacity:0.7; top: 20px; right: 20px;"></i>
            <h3 class="text-2xl font-bold text-amber-600 dark:text-sky-400 mb-4 font-kalam">${entryData.text.substring(0, 60)}${entryData.text.length > 60 ? '...' : ''}</h3>
            <p class="postcard-text text-lg mb-4 max-h-60 overflow-y-auto p-2 rounded">${entryData.text}</p>
            <p class="postcard-date text-sm">Sent: ${new Date(entryData.timestamp).toLocaleString()}</p>
        `;
        postcardFocusModal.classList.remove('hidden');
        setTimeout(() => {
            if (postcardFocusModal) postcardFocusModal.classList.add('visible');
            const modalContentDiv = postcardFocusModal.querySelector('.postcard-modal-content');
            if (modalContentDiv) modalContentDiv.classList.add('visible');
        }, 10);
    }

    if (closeFocusModalBtn) {
        closeFocusModalBtn.addEventListener('click', () => {
            if (!postcardFocusModal) return;
            const modalContentDiv = postcardFocusModal.querySelector('.postcard-modal-content');
            if (modalContentDiv) modalContentDiv.classList.remove('visible');
            postcardFocusModal.classList.remove('visible');
            setTimeout(() => postcardFocusModal.classList.add('hidden'), 300);
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && postcardFocusModal && postcardFocusModal.classList.contains('visible')) {
            if (closeFocusModalBtn) closeFocusModalBtn.click();
        }
    });

    async function fetchAndDisplayRecentEntries() {
        if (!postcardsContainer || !loadingEntriesMsg || !noEntriesMessage || !entriesCounter) return;
        loadingEntriesMsg.classList.remove('hidden');
        postcardsContainer.innerHTML = '';
        noEntriesMessage.classList.add('hidden');

        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Unknown error fetching entries" }));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            allEntriesCache = await response.json();
            
            loadingEntriesMsg.classList.add('hidden');
            entriesCounter.textContent = `${allEntriesCache.length} summer dream${allEntriesCache.length !== 1 ? 's' : ''} shared so far!`;

            if (allEntriesCache.length === 0) {
                noEntriesMessage.classList.remove('hidden');
                noEntriesMessage.classList.add('animate-show');
            } else {
                const recentEntries = allEntriesCache.slice(0, 9);
                recentEntries.forEach((entry, index) => {
                    const postcardElement = document.createElement('div');
                    postcardElement.className = 'postcard-item cursor-magnify';
                    postcardElement.style.setProperty('--animation-delay', `${index * 0.1}s`);
                    postcardElement.dataset.entryId = entry.id;

                    const displayStamp = entry.userStampClass || 'fa-star text-yellow-400';
                    entry.displayStamp = displayStamp;

                    postcardElement.innerHTML = `
                        <div class="postcard-flipper">
                            <div class="postcard-front">
                                <div class="postcard-actions">
                                    <button class="favorite-btn" aria-label="Favorite" data-favorited="false">
                                        <i class="far fa-heart"></i>
                                    </button>
                                </div>
                                <i class="fas ${displayStamp} postcard-item-stamp"></i>
                                <p class="postcard-text">${entry.text}</p>
                                <p class="postcard-date">Sent: ${new Date(entry.timestamp).toLocaleDateString()}</p>
                            </div>
                            <div class="postcard-back">
                                <div class="postcard-back-address-lines">
                                    <hr><hr><hr>
                                </div>
                                <div class="postcard-back-stamp-area">STAMP</div>
                                <p style="font-size: 0.8rem; margin-top: auto;">Summer Boardwalk Archive</p>
                            </div>
                        </div>
                    `;
                    
                    postcardElement.addEventListener('click', (e) => {
                        if (!e.target.closest('.favorite-btn') && !postcardElement.classList.contains('is-flipping')) {
                           showFocusModal(entry);
                        }
                    });

                    const favoriteBtn = postcardElement.querySelector('.favorite-btn');
                    favoriteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isFavorited = favoriteBtn.dataset.favorited === 'true';
                        favoriteBtn.dataset.favorited = !isFavorited;
                        favoriteBtn.innerHTML = !isFavorited ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
                        favoriteBtn.classList.toggle('favorited', !isFavorited);
                    });
                    postcardsContainer.appendChild(postcardElement);
                });
            }
        } catch (error) {
            console.error('Error fetching entries:', error);
            if(loadingEntriesMsg) loadingEntriesMsg.classList.add('hidden');
            if(entriesCounter) entriesCounter.textContent = 'Could not load dream count.';
            if(noEntriesMessage) {
                noEntriesMessage.textContent = `Could not load postcards: ${error.message}`;
                noEntriesMessage.classList.remove('hidden');
                noEntriesMessage.classList.add('text-red-500');
            }
        }
    }

    if (surpriseMeBtn && messageInABottleContainer && messageBottleImg) {
        surpriseMeBtn.addEventListener('click', () => {
            if (allEntriesCache.length === 0) {
                showUserMessage("No postcards to surprise you with yet!", true);
                return;
            }
            messageInABottleContainer.classList.remove('hidden');
            setTimeout(() => messageInABottleContainer.classList.add('visible'), 10);
        });

        messageBottleImg.addEventListener('click', () => {
            messageInABottleContainer.classList.remove('visible');
            setTimeout(() => messageInABottleContainer.classList.add('hidden'), 800);

            if (allEntriesCache.length > 0) {
                const randomIndex = Math.floor(Math.random() * allEntriesCache.length);
                const randomEntry = allEntriesCache[randomIndex];
                showFocusModal(randomEntry);

                const galleryCard = postcardsContainer.querySelector(`.postcard-item[data-entry-id="${randomEntry.id}"]`);
                if (galleryCard) {
                    document.querySelectorAll('.postcard-item.highlighted').forEach(card => card.classList.remove('highlighted'));
                    galleryCard.classList.add('highlighted');
                    galleryCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => galleryCard.classList.remove('highlighted'), 2000);
                }
            }
        });
    }

    if (entryForm) {
        entryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!entryTextarea) return;
            
            const planText = entryTextarea.value.trim();
            if (!planText) {
                showUserMessage('Please write your summer plan on the postcard!', true);
                entryTextarea.focus();
                return;
            }

            const submitButton = entryForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            const postcardInputSection = document.getElementById('summerPostcard');

            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Mailing Postcard...';

            if (postcardInputSection) postcardInputSection.classList.add('animate-fly-off');

            try {
                const response = await fetch(API_BASE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: planText, userStampClass: selectedStampClass }),
                });

                if (!response.ok) {
                    if (postcardInputSection) postcardInputSection.classList.remove('animate-fly-off');
                    const errorData = await response.json().catch(() => ({ message: "Unknown error submitting plan" }));
                    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
                }
                
                setTimeout(() => {
                    showUserMessage('Postcard mailed! Your summer dream is on its way.', false);
                    entryTextarea.value = '';
                    if (postcardInputSection) postcardInputSection.classList.remove('animate-fly-off');
                    fetchAndDisplayRecentEntries();
                }, 700);

            } catch (error) {
                console.error('Error submitting entry:', error);
                showUserMessage(`Oops! Postcard got lost: ${error.message}`, true);
                if (postcardInputSection) postcardInputSection.classList.remove('animate-fly-off');
            } finally {
                setTimeout(() => {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalButtonText;
                    }
                }, 750);
            }
        });
    }
});
