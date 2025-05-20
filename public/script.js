document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const interactivePrompt = document.getElementById('interactivePrompt');
    const mainContent = document.getElementById('mainContent');
    const loadingSun = document.getElementById('loadingSun');
    const loadingClouds = [
        document.getElementById('loadingCloud1'),
        document.getElementById('loadingCloud2'),
        document.getElementById('loadingCloud3')
    ];

    const entryForm = document.getElementById('entryForm');
    const entryTextarea = document.getElementById('entryText');
    const formMessage = document.getElementById('formMessage');
    const inputStamp = document.getElementById('inputStamp');
    const stampSelector = document.getElementById('stampSelector');
    let selectedStampClass = 'fa-sun'; // Default stamp

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
    let allEntriesCache = []; // Cache entries for surprise me

    // --- Parallax for Loading Screen ---
    if (loadingScreen && !loadingScreen.classList.contains('hidden-screen')) {
        loadingScreen.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;

            const moveX = (clientX - innerWidth / 2) / (innerWidth / 2); // -1 to 1
            const moveY = (clientY - innerHeight / 2) / (innerHeight / 2); // -1 to 1

            if (loadingSun) {
                loadingSun.style.left = `calc(50% + ${moveX * -10}px)`; // Sun moves opposite to mouse slightly
                loadingSun.style.top = `calc(10% + ${moveY * -5}px)`;
            }
            loadingClouds.forEach((cloud, index) => {
                if (cloud) {
                    const cloudMoveFactor = 5 + index * 3; // Different movement for each cloud
                    cloud.style.left = `calc(${cloud.style.left || (index === 0 ? '10%' : (index === 1 ? '70%' : '40%'))} + ${moveX * cloudMoveFactor}px)`;
                    cloud.style.top = `calc(${cloud.style.top || (index === 0 ? '15%' : (index === 1 ? '25%' : '20%'))} + ${moveY * cloudMoveFactor * 0.5}px)`;
                }
            });
        });
    }


    // --- Loading Screen Logic ---
    function hideLoadingScreen() {
        if (!loadingScreen || loadingScreen.classList.contains('hidden-screen')) return;
        loadingScreen.classList.add('hidden-screen');
        // Remove parallax listener to save resources
        if (loadingScreen) loadingScreen.removeEventListener('mousemove', () => {});

        setTimeout(() => {
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (mainContent) {
                mainContent.classList.remove('hidden');
                document.body.classList.remove('overflow-hidden');
                // Apply thematic cursors to body or specific main sections if needed
                // document.body.style.cursor = 'default'; // Ensure it's reset
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

    // --- Animated Stamp on Input ---
    if (entryTextarea && inputStamp) {
        entryTextarea.addEventListener('input', () => {
            if (!inputStamp.classList.contains('wiggle')) {
                inputStamp.classList.add('wiggle');
                setTimeout(() => inputStamp.classList.remove('wiggle'), 500);
            }
        });
    }

    // --- Stamp Selector Logic ---
    if (stampSelector) {
        const stampChoices = stampSelector.querySelectorAll('.stamp-choice');
        stampChoices.forEach(choice => {
            choice.addEventListener('click', () => {
                stampChoices.forEach(c => c.classList.remove('selected-stamp'));
                choice.classList.add('selected-stamp');
                selectedStampClass = choice.dataset.stamp;
                // Update the main input stamp visual if desired
                if (inputStamp) {
                    inputStamp.className = `fas ${selectedStampClass} postcard-stamp text-6xl`; // Adjust color class if needed
                     // Add a little pop effect to the main stamp
                    inputStamp.style.transform = 'rotate(12deg) scale(1.2)';
                    setTimeout(() => { inputStamp.style.transform = 'rotate(12deg) scale(0.9)';}, 150);
                }
            });
        });
    }


    // --- Utility to Show Messages ---
    function showUserMessage(message, isError = false) {
        if (!formMessage) return;
        formMessage.textContent = message;
        formMessage.className = `mt-4 text-md text-center ${isError ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}`;
        setTimeout(() => { formMessage.textContent = ''; }, 4000);
    }

    // --- Postcard Focus Modal Logic ---
    function showFocusModal(entryData) {
        if (!postcardFocusModal || !focusModalContent) return;
        const displayStamp = entryData.userStampClass || entryData.randomStampClass || 'fa-sun';

        focusModalContent.innerHTML = `
            <i class="fas ${displayStamp} postcard-item-stamp text-4xl" style="opacity:0.7; top: 20px; right: 20px;"></i>
            <h3 class="text-2xl font-bold text-amber-700 mb-4 font-kalam">${entryData.text.substring(0, 60)}${entryData.text.length > 60 ? '...' : ''}</h3>
            <p class="postcard-text text-lg mb-4 max-h-60 overflow-y-auto">${entryData.text}</p>
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

    // --- Fetch and Display Recent Entries as Postcards ---
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
            allEntriesCache = await response.json(); // Cache all entries
            
            loadingEntriesMsg.classList.add('hidden');

            if (allEntriesCache.length === 0) {
                noEntriesMessage.classList.remove('hidden');
                noEntriesMessage.classList.add('animate-show');
            } else {
                const recentEntries = allEntriesCache.slice(0, 9);
                recentEntries.forEach((entry, index) => {
                    const postcardElement = document.createElement('div');
                    postcardElement.className = 'postcard-item cursor-magnify'; // Add magnify cursor
                    postcardElement.style.setProperty('--animation-delay', `${index * 0.1}s`);
                    postcardElement.dataset.entryId = entry.id;

                    // Use the stamp selected by user if available, otherwise a random one
                    const displayStamp = entry.userStampClass || entry.randomStampClass || 'fa-sun';
                     // Store the stamp used for the focus modal
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

    // --- "Surprise Me!" / Message in a Bottle Logic ---
    if (surpriseMeBtn && messageInABottleContainer && messageBottleImg) {
        surpriseMeBtn.addEventListener('click', () => {
            if (allEntriesCache.length === 0) {
                showUserMessage("No postcards to surprise you with yet!", true);
                return;
            }
            messageInABottleContainer.classList.remove('hidden');
            setTimeout(() => messageInABottleContainer.classList.add('visible'), 10); // Animate bottle in
        });

        messageBottleImg.addEventListener('click', () => {
            messageInABottleContainer.classList.remove('visible');
            setTimeout(() => messageInABottleContainer.classList.add('hidden'), 800); // Hide after animation

            if (allEntriesCache.length > 0) {
                const randomIndex = Math.floor(Math.random() * allEntriesCache.length);
                const randomEntry = allEntriesCache[randomIndex];
                showFocusModal(randomEntry); // Show the random entry in the focus modal

                // Optional: highlight the card in the gallery if it's visible
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


    // --- Form Submission Logic ---
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
                    body: JSON.stringify({ text: planText, userStampClass: selectedStampClass }), // Send selected stamp
                });

                if (!response.ok) {
                    if (postcardInputSection) postcardInputSection.classList.remove('animate-fly-off');
                    const errorData = await response.json().catch(() => ({ message: "Unknown error submitting plan" }));
                    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
                }
                
                setTimeout(() => {
                    showUserMessage('Postcard mailed! Your summer dream is on its way.', false);
                    entryTextarea.value = '';
                    if (postcardInputSection) postcardInputSection.classList.remove('animate-fly-off'); // Reset after animation
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
