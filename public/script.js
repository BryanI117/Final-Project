document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const interactivePrompt = document.getElementById('interactivePrompt');
    const mainContent = document.getElementById('mainContent');
    const loadingSun = document.getElementById('loadingSun');
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
    let selectedStampClass = 'fa-sun'; 

    const postcardsContainer = document.getElementById('postcardsContainer');
    const loadingEntriesMsg = document.getElementById('loadingEntries');
    const noEntriesMessage = document.getElementById('noEntriesMessage');
    const surpriseMeBtn = document.getElementById('surpriseMeBtn');

    const postcardFocusModal = document.getElementById('postcardFocusModal');
    const focusModalContent = document.getElementById('focusModalContent');
    const closeFocusModalBtn = document.getElementById('closeFocusModalBtn');

    const messageInABottleContainer = document.getElementById('messageInABottleContainer');
    const messageBottleImg = document.getElementById('messageBottleImg');

    const API_BASE_URL = '/api/entries';
    let allEntriesCache = []; 

    function handleLoadingScreenMouseMove(e) {
        if (!loadingScreen || loadingScreen.classList.contains('hidden-screen')) return;

        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;

        const moveX = (clientX - innerWidth / 2) / (innerWidth / 2);
        const moveY = (clientY - innerHeight / 2) / (innerHeight / 2); 

        if (loadingSun) {
            requestAnimationFrame(() => {
                loadingSun.style.transform = `translateX(calc(-50% + ${moveX * -10}px)) translateY(${moveY * -5}px) scale(${getComputedStyle(loadingSun).getPropertyValue('transform').includes('scale(0.8)') ? 0.8 : 1})`;
            });
        }
        loadingClouds.forEach((cloud, index) => {
            if (cloud) {
                const cloudMoveFactor = 5 + index * 3;
                const initialLeft = cloud.dataset.initialLeft || (index === 0 ? '10%' : (index === 1 ? '70%' : '40%'));
                const initialTop = cloud.dataset.initialTop || (index === 0 ? '15%' : (index === 1 ? '25%' : '20%'));
                if (!cloud.dataset.initialLeft) cloud.dataset.initialLeft = initialLeft;
                if (!cloud.dataset.initialTop) cloud.dataset.initialTop = initialTop;

                requestAnimationFrame(() => {
                    cloud.style.transform = `translateX(${moveX * cloudMoveFactor}px) translateY(${moveY * cloudMoveFactor * 0.5}px)`;
                });
            }
        });
    }
    if (loadingScreen) {
       loadingScreen.addEventListener('mousemove', handleLoadingScreenMouseMove);
    }


    function hideLoadingScreen() {
        if (!loadingScreen || loadingScreen.classList.contains('hidden-screen')) return;
        loadingScreen.classList.add('hidden-screen');
        if (loadingScreen) loadingScreen.removeEventListener('mousemove', handleLoadingScreenMouseMove);


        setTimeout(() => {
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (mainContent) {
                mainContent.classList.remove('hidden');
                document.body.classList.remove('overflow-hidden');
                setTimeout(() => mainContent.classList.add('visible'), 50);
            }
            fetchAndDisplayRecentEntries();
        }, 1000);
    }

    if (interactivePrompt) interactivePrompt.addEventListener('click', hideLoadingScreen);
    let keydownListenerAdded = false;
    function handleKeydown(event) {
        if (!keydownListenerAdded) {
            hideLoadingScreen();
            keydownListenerAdded = true;
            document.removeEventListener('keydown', handleKeydown);
        }
    }
    document.addEventListener('keydown', handleKeydown);

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
                selectedStampClass = choice.dataset.stamp;
                if (inputStamp) {
                    const currentStampIcon = inputStamp.querySelector('i') || inputStamp; 
                    currentStampIcon.className = `fas ${selectedStampClass} postcard-stamp text-6xl`; 

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
        const displayStamp = entryData.userStampClass || entryData.randomStampClass || 'fa-sun';

        focusModalContent.innerHTML = `
            <i class="fas ${displayStamp} postcard-item-stamp text-4xl" style="opacity:0.7; top: 20px; right: 20px;"></i>
            <h3 class="text-2xl font-bold text-amber-700 mb-4 font-kalam">${entryData.text.substring(0, 60)}${entryData.text.length > 60 ? '...' : ''}</h3>
            <p class="postcard-text text-lg mb-4 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded">${entryData.text}</p>
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
        if (!postcardsContainer || !loadingEntriesMsg || !noEntriesMessage) return;
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

                    const displayStamp = entry.userStampClass || 'fa-star'; 
                    entry.displayStamp = displayStamp;


                    postcardElement.innerHTML = `
                        <div class="postcard-actions">
                            <button class="favorite-btn" aria-label="Favorite" data-favorited="false">
                                <i class="far fa-heart"></i>
                            </button>
                        </div>
                        <i class="fas ${displayStamp} postcard-item-stamp"></i>
                        <p class="postcard-text">${entry.text}</p>
                        <p class="postcard-date">Sent: ${new Date(entry.timestamp).toLocaleDateString()}</p>
                    `;
                    
                    postcardElement.addEventListener('click', (e) => {
                        if (!e.target.closest('.favorite-btn')) {
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
    console.log("Fully enhanced interactive frontend script initialized.");
});
