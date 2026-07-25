// State
let emails = [];
let currentCategory = 'inbox';
let searchQuery = '';
let selectedEmailId = null;
let isMobileDetailView = false;
let isDarkMode = false;

// Categories Definition
const categories = [
    { id: 'inbox', label: 'Inbox', icon: 'ph-tray', unreadCount: true },
    { id: 'starred', label: 'Starred', icon: 'ph-star', unreadCount: false },
    { id: 'sent', label: 'Sent', icon: 'ph-paper-plane-right', unreadCount: false },
    { id: 'drafts', label: 'Drafts', icon: 'ph-file-text', unreadCount: false },
    { id: 'trash', label: 'Trash', icon: 'ph-trash', unreadCount: false },
];

// DOM Elements
const emailListContainer = document.getElementById('emailListContainer');
const emailDetailContent = document.getElementById('emailDetailContent');
const emailListCol = document.getElementById('emailListCol');
const emailDetailCol = document.getElementById('emailDetailCol');
const mobileBackBtn = document.getElementById('mobileBackBtn');
const mobileLogo = document.getElementById('mobileLogo');
const searchInput = document.getElementById('searchInput');
const viewTitle = document.getElementById('viewTitle');
const navCategories = document.getElementById('navCategories');
const composeModal = document.getElementById('composeModal');
const composeModalContent = document.getElementById('composeModalContent');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const mobileThemeBtn = document.getElementById('mobileThemeBtn');
const emailCountDisplay = document.getElementById('emailCountDisplay');
const toastContainer = document.getElementById('toastContainer');

// Compose Elements
const composeTo = document.getElementById('composeTo');
const composeSubject = document.getElementById('composeSubject');
const composeBody = document.getElementById('composeBody');
const sendEmailBtn = document.getElementById('sendEmailBtn');

// Initialize App
function init() {
    loadEmails();
    renderSidebar();
    renderEmailList();
    setupEventListeners();
    checkResponsive();
    
    // Check saved theme
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        isDarkMode = true;
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Data Persistence
function loadEmails() {
    const saved = localStorage.getItem('beemail_data');
    if (saved) {
        emails = JSON.parse(saved);
    } else {
        emails = [...mockEmails];
        saveEmails();
    }
}

function saveEmails() {
    localStorage.setItem('beemail_data', JSON.stringify(emails));
}

// Toast Notification System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl transform transition-all duration-300 translate-y-10 opacity-0 pointer-events-auto bg-white dark:bg-dark-800 border border-slate-100 dark:border-dark-700`;
    
    const icon = type === 'success' 
        ? '<i class="ph-fill ph-check-circle text-2xl text-green-500"></i>' 
        : '<i class="ph-fill ph-info text-2xl text-brand-500"></i>';
        
    toast.innerHTML = `
        ${icon}
        <span class="font-semibold text-slate-800 dark:text-white text-sm">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-5');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Render Sidebar Navigation
function renderSidebar() {
    navCategories.innerHTML = '';
    categories.forEach(cat => {
        const unread = cat.unreadCount ? emails.filter(e => e.category === cat.id && !e.read).length : 0;
        const isActive = currentCategory === cat.id;
        
        const a = document.createElement('a');
        a.href = '#';
        a.className = `flex items-center justify-between px-4 py-3 rounded-xl transition-all-200 group ${isActive ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 hover:text-slate-900 dark:hover:text-slate-200'}`;
        
        a.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="ph ${isActive ? cat.icon.replace('ph-', 'ph-fill ph-') : cat.icon} text-xl"></i>
                <span>${cat.label}</span>
            </div>
            ${unread > 0 ? `<span class="bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">${unread}</span>` : ''}
        `;
        
        a.addEventListener('click', (e) => {
            e.preventDefault();
            changeCategory(cat.id);
        });
        
        navCategories.appendChild(a);
    });

    // Update Mobile Nav
    document.querySelectorAll('.nav-item-mobile').forEach(btn => {
        const catId = btn.dataset.cat;
        if (catId === currentCategory) {
            btn.classList.add('text-brand-500');
            btn.classList.remove('text-slate-400');
            const icon = btn.querySelector('i');
            icon.className = icon.className.replace('ph ', 'ph-fill ');
        } else {
            btn.classList.remove('text-brand-500');
            btn.classList.add('text-slate-400');
            const icon = btn.querySelector('i');
            icon.className = icon.className.replace('ph-fill ', 'ph ');
        }
    });
}

function changeCategory(categoryId) {
    currentCategory = categoryId;
    selectedEmailId = null; // reset selection
    viewTitle.textContent = categories.find(c => c.id === categoryId)?.label || 'Inbox';
    if (isMobileDetailView) {
        closeMobileDetail();
    }
    renderSidebar();
    renderEmailList();
    renderEmailDetail(); // clear detail view
}

// Render Email List
function renderEmailList() {
    emailListContainer.innerHTML = '';
    
    let filteredEmails = emails.filter(e => {
        // Category filter
        const matchCategory = currentCategory === 'starred' ? e.starred && e.category !== 'trash' : e.category === currentCategory;
        // Search filter
        const matchSearch = e.subject.toLowerCase().includes(searchQuery) || e.sender.toLowerCase().includes(searchQuery);
        return matchCategory && matchSearch;
    });

    // Update count display
    emailCountDisplay.textContent = filteredEmails.length;

    if (filteredEmails.length === 0) {
        emailListContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-slate-400">
                <i class="ph ph-empty text-4xl mb-3 opacity-50"></i>
                <p>No emails found.</p>
            </div>
        `;
        return;
    }

    filteredEmails.forEach(email => {
        const isSelected = selectedEmailId === email.id;
        const row = document.createElement('div');
        row.className = `email-row cursor-pointer p-4 rounded-xl border mb-2 transition-all duration-200 group relative overflow-hidden ${
            isSelected 
                ? 'bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-500/30 shadow-sm' 
                : (email.read ? 'bg-white border-transparent hover:border-slate-200 dark:bg-dark-800 dark:hover:border-dark-600' : 'bg-white border-slate-100 shadow-sm dark:bg-dark-800 dark:border-dark-700')
        }`;
        
        row.innerHTML = `
            ${!email.read && !isSelected ? `<div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-xl"></div>` : ''}
            <div class="flex items-start gap-3">
                <div class="relative mt-1 shrink-0">
                    <img src="${email.avatar}" class="w-10 h-10 rounded-full object-cover">
                    ${!email.read ? `<div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-500 border-2 border-white dark:border-dark-800 rounded-full"></div>` : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-0.5">
                        <h4 class="text-[15px] ${!email.read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'} truncate pr-2">${email.sender}</h4>
                        <span class="text-xs ${!email.read ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-slate-500'} shrink-0">${email.timestamp}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <p class="text-[14px] ${!email.read ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'} truncate pr-2">${email.subject}</p>
                        <button class="star-btn p-1.5 -mr-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors shrink-0 ${email.starred ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400'}" data-id="${email.id}" title="${email.starred ? 'Unstar' : 'Star'}">
                            <i class="${email.starred ? 'ph-fill' : 'ph'} ph-star text-lg"></i>
                        </button>
                    </div>
                    <p class="text-sm text-slate-500 dark:text-slate-500 truncate mt-0.5">${email.snippet}</p>
                </div>
            </div>
        `;

        // Click row to open detail
        row.addEventListener('click', (e) => {
            if (e.target.closest('.star-btn')) return; // Ignore if clicking star
            openEmailDetail(email.id);
        });

        // Click star to toggle
        const starBtn = row.querySelector('.star-btn');
        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStar(email.id);
        });

        emailListContainer.appendChild(row);
    });
}

// Render Email Detail
function renderEmailDetail() {
    if (!selectedEmailId) {
        emailDetailContent.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 hidden md:flex">
                <div class="w-24 h-24 rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center mb-6">
                <i class="ph ph-envelope-open text-4xl text-slate-300 dark:text-slate-600"></i>
                </div>
                <p class="text-xl font-medium text-slate-500 dark:text-slate-400">Select an email to read</p>
                <p class="text-sm mt-2 text-slate-400 dark:text-slate-500">Nothing is selected currently.</p>
            </div>
        `;
        return;
    }

    const email = emails.find(e => e.id === selectedEmailId);
    if (!email) return;

    const isTrash = email.category === 'trash';

    // Generate HTML for thread replies
    const repliesHTML = email.replies && email.replies.length > 0 ? email.replies.map(reply => `
        <div class="flex gap-4 mt-8">
            <img src="${reply.avatar}" class="w-10 h-10 rounded-full object-cover shadow-sm">
            <div class="flex-1 bg-slate-50 dark:bg-dark-800 rounded-2xl rounded-tl-none p-5 shadow-sm border border-slate-100 dark:border-dark-700">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-slate-900 dark:text-white text-[15px]">${reply.sender}</span>
                    <span class="text-xs text-slate-400 font-medium">${reply.timestamp}</span>
                </div>
                <div class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">${reply.body.replace(/\n/g, '<br>')}</div>
            </div>
        </div>
    `).join('') : '';

    emailDetailContent.innerHTML = `
        <div class="h-full flex flex-col bg-white dark:bg-dark-900 md:m-4 md:rounded-2xl md:border border-slate-200 dark:border-dark-700 md:shadow-sm overflow-hidden relative">
            
            ${isTrash ? `
            <div class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-6 py-2 text-sm font-medium flex items-center justify-between border-b border-red-100 dark:border-red-900/30">
                <span>This message is in the Trash.</span>
            </div>` : ''}

            <!-- Toolbar -->
            <div class="px-6 py-4 border-b border-slate-100 dark:border-dark-800 flex justify-between items-center bg-slate-50/50 dark:bg-dark-900">
                <div class="flex gap-2">
                    <button class="w-10 h-10 rounded-full hover:bg-slate-200 dark:hover:bg-dark-700 flex items-center justify-center text-slate-500 transition-colors" title="Archive">
                        <i class="ph ph-archive-box text-xl"></i>
                    </button>
                    
                    ${isTrash ? `
                    <button id="restoreEmailBtn" class="w-10 h-10 rounded-full hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 flex items-center justify-center text-slate-500 transition-colors" title="Restore to Inbox">
                        <i class="ph ph-arrow-u-up-left text-xl"></i>
                    </button>
                    ` : `
                    <button id="deleteEmailBtn" class="w-10 h-10 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 flex items-center justify-center text-slate-500 transition-colors" title="Move to Trash">
                        <i class="ph ph-trash text-xl"></i>
                    </button>
                    `}
                    
                    <button id="toggleReadBtn" class="w-10 h-10 rounded-full hover:bg-slate-200 dark:hover:bg-dark-700 flex items-center justify-center text-slate-500 transition-colors" title="${email.read ? 'Mark Unread' : 'Mark Read'}">
                        <i class="ph ${email.read ? 'ph-envelope' : 'ph-envelope-open'} text-xl"></i>
                    </button>
                </div>
                <div class="flex gap-2">
                    <button class="w-10 h-10 rounded-full hover:bg-slate-200 dark:hover:bg-dark-700 flex items-center justify-center text-slate-500 transition-colors" title="More">
                        <i class="ph ph-dots-three-vertical text-xl"></i>
                    </button>
                </div>
            </div>

            <!-- Email Header -->
            <div class="p-6 md:p-8 flex-1 overflow-y-auto pb-8">
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">${email.subject}</h2>
                
                <div class="flex items-start justify-between mb-8">
                    <div class="flex items-center gap-4">
                        <img src="${email.avatar}" class="w-12 h-12 rounded-full object-cover shadow-sm">
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-slate-900 dark:text-white text-lg">${email.sender}</h3>
                                <span class="text-xs text-slate-400 bg-slate-100 dark:bg-dark-700 px-2 py-0.5 rounded-full capitalize">${email.category}</span>
                            </div>
                            <p class="text-sm text-slate-500 font-medium">to me <span class="mx-1">&bull;</span> ${email.senderEmail || 'sender@beemail.io'}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm text-slate-400 font-medium">${email.timestamp}</span>
                        <button class="star-btn-detail text-xl ${email.starred ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400'} transition-colors" data-id="${email.id}">
                            <i class="${email.starred ? 'ph-fill' : 'ph'} ph-star"></i>
                        </button>
                    </div>
                </div>

                <!-- Original Email Body -->
                <div class="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                    ${email.body.replace(/\n/g, '<br>')}
                </div>
                
                <!-- Replies Thread -->
                ${repliesHTML}

                <!-- Reply Box -->
                <div class="mt-10 pt-6 border-t border-slate-200 dark:border-dark-700">
                    <div class="border border-slate-200 dark:border-dark-700 rounded-xl p-3 flex gap-3 focus-within:ring-2 ring-brand-500/50 transition-shadow bg-white dark:bg-dark-800">
                        <img src="https://i.pravatar.cc/150?u=me" class="w-10 h-10 rounded-full object-cover shadow-sm">
                        <input type="text" id="replyInput" placeholder="Reply to ${email.sender}..." class="flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-medium placeholder-slate-400" autocomplete="off">
                        <button id="sendReplyBtn" class="bg-brand-500 hover:bg-brand-600 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50">
                            <i class="ph ph-paper-plane-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('toggleReadBtn').addEventListener('click', () => {
        email.read = !email.read;
        saveEmails();
        renderEmailList();
        renderSidebar();
        renderEmailDetail(); // Update the icon in detail view
    });

    if (document.getElementById('deleteEmailBtn')) {
        document.getElementById('deleteEmailBtn').addEventListener('click', () => {
            email.category = 'trash';
            saveEmails();
            showToast("Moved to Trash");
            selectedEmailId = null; 
            renderSidebar();
            renderEmailList();
            renderEmailDetail();
            if (isMobileDetailView) closeMobileDetail();
        });
    }

    if (document.getElementById('restoreEmailBtn')) {
        document.getElementById('restoreEmailBtn').addEventListener('click', () => {
            email.category = 'inbox'; // Default restore to inbox
            saveEmails();
            showToast("Restored to Inbox");
            selectedEmailId = null; 
            renderSidebar();
            renderEmailList();
            renderEmailDetail();
            if (isMobileDetailView) closeMobileDetail();
        });
    }

    document.querySelector('.star-btn-detail').addEventListener('click', () => {
        toggleStar(email.id);
        renderEmailDetail();
    });

    // Handle Thread Reply
    const replyInput = document.getElementById('replyInput');
    const sendReplyBtn = document.getElementById('sendReplyBtn');
    
    const submitReply = () => {
        const text = replyInput.value.trim();
        if (!text) return;
        
        if (!email.replies) email.replies = [];
        
        email.replies.push({
            id: Date.now(),
            sender: "Me",
            avatar: "https://i.pravatar.cc/150?u=me",
            body: text,
            timestamp: "Just now"
        });
        
        saveEmails();
        showToast("Reply Sent");
        
        // Re-render detail view to show new message
        renderEmailDetail();
        
        // Scroll to bottom of detail view
        const detailScrollArea = document.querySelector('#emailDetailContent > div > div:nth-child(3)');
        if (detailScrollArea) {
            detailScrollArea.scrollTop = detailScrollArea.scrollHeight;
        }
    };
    
    sendReplyBtn.addEventListener('click', submitReply);
    replyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitReply();
    });
}

function openEmailDetail(id) {
    selectedEmailId = id;
    
    // Mark as read
    const email = emails.find(e => e.id === id);
    if (email && !email.read) {
        email.read = true;
        saveEmails();
        renderSidebar(); // update unread count
    }

    renderEmailList(); // update active state
    renderEmailDetail();

    // Mobile specific logic
    if (window.innerWidth < 768) {
        isMobileDetailView = true;
        emailListCol.classList.add('-translate-x-full');
        emailDetailCol.classList.remove('translate-x-full');
        mobileBackBtn.classList.remove('hidden');
        mobileLogo.classList.add('hidden');
    }
}

function closeMobileDetail() {
    isMobileDetailView = false;
    emailListCol.classList.remove('-translate-x-full');
    emailDetailCol.classList.add('translate-x-full');
    mobileBackBtn.classList.add('hidden');
    mobileLogo.classList.remove('hidden');
    selectedEmailId = null;
    renderEmailList();
}

function toggleStar(id) {
    const email = emails.find(e => e.id === id);
    if (email) {
        email.starred = !email.starred;
        saveEmails();
        renderEmailList();
    }
}

// Handle Compose Send
function handleSendEmail() {
    const to = composeTo.value.trim();
    const subject = composeSubject.value.trim();
    const body = composeBody.value.trim();

    if (!to || !body) {
        alert("Please specify a recipient and a message body.");
        return;
    }

    const newEmail = {
        id: Date.now(),
        sender: "Me",
        senderEmail: "bilal@beemail.io",
        subject: subject || "(No Subject)",
        snippet: body.length > 50 ? body.substring(0, 50) + "..." : body,
        body: body,
        timestamp: "Just now",
        category: "sent",
        read: true,
        starred: false,
        avatar: "https://i.pravatar.cc/150?u=me",
        replies: []
    };

    emails.unshift(newEmail);
    saveEmails();

    const originalText = sendEmailBtn.innerHTML;
    sendEmailBtn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Sending...`;
    
    setTimeout(() => {
        // Clear form
        composeTo.value = '';
        composeSubject.value = '';
        composeBody.value = '';
        
        closeComposeModal();
        showToast("Message Sent", "success");
        
        setTimeout(() => { 
            sendEmailBtn.innerHTML = originalText; 
            changeCategory('sent'); 
        }, 300);
    }, 800);
}

function openComposeModal() {
    composeModal.classList.remove('hidden');
    // Small delay to allow display:block to apply before animating opacity/transform
    setTimeout(() => {
        composeModal.classList.remove('opacity-0');
        composeModalContent.classList.remove('translate-y-full', 'sm:scale-95');
        composeTo.focus();
    }, 10);
}

function closeComposeModal() {
    composeModal.classList.add('opacity-0');
    composeModalContent.classList.add('translate-y-full', 'sm:scale-95');
    setTimeout(() => {
        composeModal.classList.add('hidden');
    }, 300);
}

// Event Listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderEmailList();
    });

    // Mobile Back
    mobileBackBtn.addEventListener('click', closeMobileDetail);

    // Compose Modal
    document.getElementById('composeBtn').addEventListener('click', openComposeModal);
    document.getElementById('mobileComposeBtn').addEventListener('click', openComposeModal);
    document.getElementById('closeComposeBtn').addEventListener('click', closeComposeModal);
    sendEmailBtn.addEventListener('click', handleSendEmail);

    // Theme Toggle
    const toggleTheme = () => {
        isDarkMode = !isDarkMode;
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
    };
    themeToggleBtn.addEventListener('click', toggleTheme);
    mobileThemeBtn.addEventListener('click', toggleTheme);

    // Resize handling for responsive view
    window.addEventListener('resize', checkResponsive);

    // Mobile Nav clicks
    document.querySelectorAll('.nav-item-mobile').forEach(btn => {
        btn.addEventListener('click', (e) => {
            changeCategory(btn.dataset.cat);
        });
    });
}

function checkResponsive() {
    if (window.innerWidth >= 768) {
        // Desktop
        emailListCol.classList.remove('-translate-x-full');
        emailDetailCol.classList.remove('translate-x-full');
        mobileBackBtn.classList.add('hidden');
        mobileLogo.classList.remove('hidden');
        
        // Auto-select first email if none selected
        if (!selectedEmailId && currentCategory !== 'drafts') {
            const visibleEmails = emails.filter(e => currentCategory === 'starred' ? e.starred && e.category !== 'trash' : e.category === currentCategory);
            if(visibleEmails.length > 0) {
                openEmailDetail(visibleEmails[0].id);
            }
        }
    } else {
        // Mobile
        if (!isMobileDetailView) {
            emailDetailCol.classList.add('translate-x-full');
            emailListCol.classList.remove('-translate-x-full');
        } else {
            emailDetailCol.classList.remove('translate-x-full');
            emailListCol.classList.add('-translate-x-full');
        }
    }
}

// Run app
document.addEventListener('DOMContentLoaded', init);
