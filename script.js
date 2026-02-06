// ==============================
// script.js (FULL REPLACEMENT)
// ==============================

let allDistricts = [];

fetch("districts.json")
  .then(res => res.json())
  .then(data => {
    allDistricts = data;
  })
  .catch(err => {
    console.error("Error loading districts.json", err);
  });

const states = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

// 🔐 Hidden “Victor mode” district option
const VICTOR_DISTRICT = {
  id: "mn_avg_salaries",
  name: "MN AVG Salaries",
  state: "Minnesota",
  isVictor: true
};

const stateInput       = document.getElementById("state-input");
const stateDropdown    = document.getElementById("state-dropdown");
const districtInput    = document.getElementById("district-input");
const districtDropdown = document.getElementById("district-dropdown");
const goButton         = document.getElementById("go-btn");
const resultBox        = document.getElementById("result");

let selectedState = "";
let selectedDistrict = null;

// Victor mode flag (true only when state input is exactly "Victor")
function isVictorMode() {
  return stateInput.value.trim().toLowerCase() === "victor";
}

function syncInputHighlight() {
  stateInput.classList.toggle("input-selected", !!selectedState);
  districtInput.classList.toggle("input-selected", !!selectedDistrict);
}

function updateGoButtonState() {
  const ready = !!(selectedState && selectedDistrict);
  if (ready) {
    goButton.disabled = false;
    goButton.classList.add("enabled");
  } else {
    goButton.disabled = true;
    goButton.classList.remove("enabled");
  }
}

goButton.disabled = true;
goButton.classList.remove("enabled");
syncInputHighlight();

// ------------------------------
// STATE INPUT DROPDOWN
// ------------------------------
stateInput.addEventListener("input", () => {
  const raw = stateInput.value.trim();
  const value = raw.toLowerCase();
  stateDropdown.innerHTML = "";

  // Reset selections whenever state changes
  selectedState = "";
  selectedDistrict = null;
  districtInput.value = "";
  districtDropdown.style.display = "none";

  syncInputHighlight();
  updateGoButtonState();

  // If empty, hide dropdown
  if (value === "") {
    stateDropdown.style.display = "none";
    return;
  }

  // 🔐 Victor mode: no autocomplete dropdown at all
  if (value === "victor") {
    selectedState = "Minnesota"; // internally set so district dropdown can work
    stateDropdown.style.display = "none";
    syncInputHighlight();
    updateGoButtonState();
    return;
  }

  // Normal behavior: autocomplete states
  const matches = states.filter(s => s.toLowerCase().startsWith(value));

  if (matches.length === 0) {
    stateDropdown.style.display = "none";
    return;
  }

  stateDropdown.style.display = "block";

  matches.forEach(state => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = state;
    item.onclick = () => selectState(state);
    stateDropdown.appendChild(item);
  });
});

function selectState(state) {
  selectedState = state;
  stateInput.value = state;
  stateDropdown.style.display = "none";

  districtInput.value = "";
  selectedDistrict = null;
  districtDropdown.style.display = "none";

  if (resultBox) resultBox.textContent = "";

  syncInputHighlight();
  updateGoButtonState();
}

stateInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();

    // If dropdown is open, select the first state
    if (stateDropdown.style.display === "block") {
      const first = stateDropdown.querySelector(".dropdown-item");
      if (first) {
        selectState(first.textContent);
        districtInput.focus();
      }
    }
  }
});

document.addEventListener("click", e => {
  if (!stateDropdown.contains(e.target) && e.target !== stateInput) {
    stateDropdown.style.display = "none";
  }
});

// ------------------------------
// DISTRICT DROPDOWN
// ------------------------------
function buildDistrictDropdown(filterText = "") {
  // If in Victor mode, show ONLY the special option
  if (isVictorMode()) {
    const lower = filterText.toLowerCase();
    if (lower && !VICTOR_DISTRICT.name.toLowerCase().includes(lower)) {
      districtDropdown.style.display = "none";
      return;
    }

    districtDropdown.innerHTML = "";
    districtDropdown.style.display = "block";

    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = VICTOR_DISTRICT.name;
    item.dataset.id = VICTOR_DISTRICT.id;
    item.onclick = () => selectDistrict(VICTOR_DISTRICT);

    districtDropdown.appendChild(item);
    return;
  }

  // Normal behavior requires a selectedState
  if (!selectedState) {
    districtDropdown.style.display = "none";
    return;
  }

  const stateDistricts = allDistricts.filter(d => d.state === selectedState);

  if (!stateDistricts.length) {
    districtDropdown.style.display = "none";
    return;
  }

  const lower = filterText.toLowerCase();
  const matches = stateDistricts.filter(d => d.name.toLowerCase().includes(lower));

  if (!matches.length) {
    districtDropdown.style.display = "none";
    return;
  }

  // Alphabetize A → Z
  matches.sort((a, b) => a.name.localeCompare(b.name));

  districtDropdown.innerHTML = "";
  districtDropdown.style.display = "block";

  matches.forEach(d => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = d.name;
    item.dataset.id = d.id;
    item.onclick = () => selectDistrict(d);
    districtDropdown.appendChild(item);
  });
}

districtInput.addEventListener("focus", () => {
  buildDistrictDropdown("");
});

districtInput.addEventListener("input", () => {
  const value = districtInput.value.trim();

  selectedDistrict = null;
  buildDistrictDropdown(value);

  syncInputHighlight();
  updateGoButtonState();
});

function selectDistrict(districtObj) {
  selectedDistrict = districtObj;
  districtInput.value = districtObj.name;
  districtDropdown.style.display = "none";

  if (resultBox) resultBox.textContent = "";

  syncInputHighlight();
  updateGoButtonState();
}

districtInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();

    // If dropdown is open, select the first item
    if (districtDropdown.style.display === "block") {
      const first = districtDropdown.querySelector(".dropdown-item");
      if (!first) return;

      // Victor option case
      if (isVictorMode()) {
        selectDistrict(VICTOR_DISTRICT);
        return;
      }

      // Normal district case
      const id = first.dataset.id;
      const d = allDistricts.find(dist => dist.id === id);
      if (d) selectDistrict(d);
      return;
    }

    // If district already selected and Go button is ready, navigate
    if (selectedDistrict && !goButton.disabled) {
      goButton.click();
    }
  }
});

document.addEventListener("click", e => {
  if (!districtDropdown.contains(e.target) && e.target !== districtInput) {
    districtDropdown.style.display = "none";
  }
});

// ------------------------------
// GO BUTTON NAVIGATION
// ------------------------------
goButton.addEventListener("click", () => {
  if (!selectedDistrict) return;

  // 🔐 Victor shortcut: go to victor.html
  if (selectedDistrict.isVictor) {
    window.location.href = "MNavgSalaries.html";
    return;
  }

  // Normal district flow
  const url =
    `secondPage.html?districtId=${encodeURIComponent(selectedDistrict.id)}&district=${encodeURIComponent(selectedDistrict.name)}`;

  window.location.href = url;
});

// ------------------------------
// FEEDBACK / COMMENTS (with Firebase)
// ------------------------------
const nameInput = document.getElementById("name-input");
const feedbackInput = document.getElementById("feedback-input");
const feedbackBtn = document.getElementById("feedback-btn");
const commentsList = document.getElementById("comments-list");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");

const COMMENTS_PER_PAGE = 5;
let currentPage = 1;

// Admin mode - add ?admin=victor2026 to URL to enable delete buttons
const ADMIN_KEY = "victor2026";
const urlParams = new URLSearchParams(window.location.search);
const isAdminMode = urlParams.get("admin") === ADMIN_KEY;

// Comments array (loaded from Firestore)
let allComments = [];
let activeReplyId = null; // Track which comment has reply box open
let activeReplyToReplyId = null; // Track which reply is being replied to (format: "commentId-replyId-replyId...")
let expandedReplies = new Set(); // Track which comments have replies expanded

// Format timestamp for display
function formatTimeAgo(timestamp) {
  if (!timestamp) return "Just now";

  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// Load comments from Firestore
async function loadComments() {
  try {
    const snapshot = await db.collection("comments").orderBy("createdAt", "desc").get();
    allComments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        author: data.author,
        text: data.text,
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        userVote: null, // User votes are local (per session)
        replies: data.replies || [],
        createdAt: data.createdAt,
        time: formatTimeAgo(data.createdAt)
      };
    });
    renderComments();
  } catch (error) {
    console.error("Error loading comments:", error);
  }
}

// Save a new comment to Firestore
async function saveComment(author, text) {
  try {
    const docRef = await db.collection("comments").add({
      author: author,
      text: text,
      likes: 0,
      dislikes: 0,
      replies: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving comment:", error);
    return null;
  }
}

// Update a comment in Firestore
async function updateComment(commentId, updates) {
  try {
    await db.collection("comments").doc(commentId).update(updates);
  } catch (error) {
    console.error("Error updating comment:", error);
  }
}

// Delete a comment from Firestore (admin only)
async function deleteComment(commentId) {
  if (!isAdminMode) return;

  if (!confirm("Are you sure you want to delete this comment?")) return;

  try {
    await db.collection("comments").doc(commentId).delete();
    // Remove from local array
    allComments = allComments.filter(c => c.id !== commentId);
    renderComments();
  } catch (error) {
    console.error("Error deleting comment:", error);
  }
}

// Delete a reply (admin only) - removes from parent's replies array
async function deleteReply(replyPath) {
  if (!isAdminMode) return;

  if (!confirm("Are you sure you want to delete this reply?")) return;

  const parts = replyPath.split("-");
  const commentId = parts[0];
  const comment = allComments.find(c => c.id === commentId);
  if (!comment) return;

  // Navigate to parent and remove the reply
  if (parts.length === 2) {
    // Direct reply to comment
    const replyId = parseInt(parts[1]);
    comment.replies = comment.replies.filter(r => r.id !== replyId);
  } else {
    // Nested reply - find parent reply
    let parent = comment;
    for (let i = 1; i < parts.length - 1; i++) {
      parent = parent.replies.find(r => r.id === parseInt(parts[i]));
      if (!parent) return;
    }
    const replyId = parseInt(parts[parts.length - 1]);
    parent.replies = parent.replies.filter(r => r.id !== replyId);
  }

  // Save to Firestore
  await updateComment(commentId, { replies: comment.replies });
  renderComments();
}

// Helper function to find a reply by path (e.g., "abc123-101-102" means comment abc123 > reply 101 > reply 102)
function findReplyByPath(comments, path) {
  const parts = path.split("-");
  const commentId = parts[0]; // String (Firestore doc ID)
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;

  let current = comment;
  for (let i = 1; i < parts.length; i++) {
    if (!current.replies) return null;
    const replyId = parseInt(parts[i]); // Reply IDs are numbers
    current = current.replies.find(r => r.id === replyId);
    if (!current) return null;
  }
  return current;
}

// Count all nested replies recursively
function countAllReplies(replies) {
  if (!replies || replies.length === 0) return 0;
  let count = replies.length;
  replies.forEach(r => {
    count += countAllReplies(r.replies);
  });
  return count;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function handleVote(commentId, voteType) {
  const comment = allComments.find(c => c.id === commentId);
  if (!comment) return;

  if (comment.userVote === voteType) {
    // User is clicking the same vote - remove it
    if (voteType === "like") comment.likes--;
    else comment.dislikes--;
    comment.userVote = null;
  } else {
    // Remove previous vote if exists
    if (comment.userVote === "like") comment.likes--;
    if (comment.userVote === "dislike") comment.dislikes--;

    // Add new vote
    if (voteType === "like") comment.likes++;
    else comment.dislikes++;
    comment.userVote = voteType;
  }

  // Save to Firestore
  updateComment(commentId, { likes: comment.likes, dislikes: comment.dislikes });

  renderComments();
}

function handleReplyVote(replyPath, voteType) {
  const reply = findReplyByPath(allComments, replyPath);
  if (!reply) return;

  // Initialize if missing
  if (reply.likes === undefined) reply.likes = 0;
  if (reply.dislikes === undefined) reply.dislikes = 0;

  if (reply.userVote === voteType) {
    // User is clicking the same vote - remove it
    if (voteType === "like") reply.likes--;
    else reply.dislikes--;
    reply.userVote = null;
  } else {
    // Remove previous vote if exists
    if (reply.userVote === "like") reply.likes--;
    if (reply.userVote === "dislike") reply.dislikes--;

    // Add new vote
    if (voteType === "like") reply.likes++;
    else reply.dislikes++;
    reply.userVote = voteType;
  }

  // Save to Firestore - update the entire comment's replies array
  const commentId = replyPath.split("-")[0];
  const comment = allComments.find(c => c.id === commentId);
  if (comment) {
    updateComment(commentId, { replies: comment.replies });
  }

  renderComments();
}

// Recursive function to render replies at any nesting level
function renderRepliesRecursive(replies, parentPath, depth = 1) {
  if (!replies || replies.length === 0) return "";

  let html = `<div class="replies" data-depth="${depth}">`;

  replies.forEach(r => {
    const replyPath = `${parentPath}-${r.id}`;
    const hasNestedReplies = r.replies && r.replies.length > 0;
    const nestedCount = hasNestedReplies ? countAllReplies(r.replies) : 0;
    const nestedWord = nestedCount === 1 ? "reply" : "replies";
    const isNestedExpanded = expandedReplies.has(replyPath);

    // Reply input box for this reply (if it's the active one)
    const nestedReplyBoxHtml = activeReplyToReplyId === replyPath ? `
      <div class="reply-input-area nested-reply-input">
        <input type="text" class="reply-name-input" placeholder="Your name (optional)">
        <textarea class="reply-text-input" placeholder="Write a reply..." rows="2"></textarea>
        <div class="reply-buttons">
          <button class="nested-reply-cancel-btn" data-path="${replyPath}">Cancel</button>
          <button class="nested-reply-submit-btn" data-path="${replyPath}">Reply</button>
        </div>
      </div>
    ` : "";

    // Nested replies toggle and content
    let nestedRepliesHtml = "";
    if (hasNestedReplies) {
      nestedRepliesHtml = `
        <button class="toggle-nested-replies-btn" data-path="${replyPath}">
          ${isNestedExpanded ? `Hide ${nestedWord}` : `View ${nestedCount} ${nestedWord}`}
        </button>
      `;
      if (isNestedExpanded) {
        nestedRepliesHtml += renderRepliesRecursive(r.replies, replyPath, depth + 1);
      }
    }

    html += `
      <div class="reply" data-depth="${depth}">
        <div class="reply-header">
          <span class="reply-author">${escapeHtml(r.author)}</span>
          <span class="reply-time">${escapeHtml(r.time)}</span>
        </div>
        <p class="reply-text">${escapeHtml(r.text)}</p>
        <div class="reply-actions">
          <button class="reply-like-btn ${r.userVote === 'like' ? 'active' : ''}" data-path="${replyPath}">
            <svg class="thumb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            <span class="like-count">${r.likes || 0}</span>
          </button>
          <button class="reply-dislike-btn ${r.userVote === 'dislike' ? 'active' : ''}" data-path="${replyPath}">
            <svg class="thumb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
            </svg>
            <span class="dislike-count">${r.dislikes || 0}</span>
          </button>
          <button class="reply-to-reply-btn" data-path="${replyPath}">Reply</button>
          ${isAdminMode ? `<button class="admin-delete-btn" data-path="${replyPath}">Delete</button>` : ''}
        </div>
        ${nestedReplyBoxHtml}
        ${nestedRepliesHtml}
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

function renderComments() {
  if (!commentsList) return;

  const totalPages = Math.max(1, Math.ceil(allComments.length / COMMENTS_PER_PAGE));

  // Ensure current page is valid
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
  const endIndex = startIndex + COMMENTS_PER_PAGE;
  const pageComments = allComments.slice(startIndex, endIndex);

  commentsList.innerHTML = "";

  pageComments.forEach(c => {
    const comment = document.createElement("div");
    comment.className = "comment";

    // Build replies HTML (oldest first) - collapsible
    let repliesHtml = "";
    if (c.replies && c.replies.length > 0) {
      const isExpanded = expandedReplies.has(c.id);
      const totalReplyCount = countAllReplies(c.replies);
      const replyWord = totalReplyCount === 1 ? "reply" : "replies";

      repliesHtml = `
        <button class="toggle-replies-btn" data-id="${c.id}">
          ${isExpanded ? `Hide ${replyWord}` : `View ${totalReplyCount} ${replyWord}`}
        </button>
      `;

      if (isExpanded) {
        repliesHtml += renderRepliesRecursive(c.replies, `${c.id}`, 1);
      }
    }

    // Reply input box (shown only if this comment is active)
    const replyBoxHtml = activeReplyId === c.id ? `
      <div class="reply-input-area">
        <input type="text" class="reply-name-input" placeholder="Your name (optional)">
        <textarea class="reply-text-input" placeholder="Write a reply..." rows="2"></textarea>
        <div class="reply-buttons">
          <button class="reply-cancel-btn" data-id="${c.id}">Cancel</button>
          <button class="reply-submit-btn" data-id="${c.id}">Reply</button>
        </div>
      </div>
    ` : "";

    comment.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(c.author)}</span>
        <span class="comment-time">${escapeHtml(c.time)}</span>
      </div>
      <p class="comment-text">${escapeHtml(c.text)}</p>
      <div class="comment-actions">
        <button class="like-btn ${c.userVote === 'like' ? 'active' : ''}" data-id="${c.id}">
          <svg class="thumb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          <span class="like-count">${c.likes}</span>
        </button>
        <button class="dislike-btn ${c.userVote === 'dislike' ? 'active' : ''}" data-id="${c.id}">
          <svg class="thumb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
          </svg>
          <span class="dislike-count">${c.dislikes}</span>
        </button>
        <button class="reply-btn" data-id="${c.id}">Reply</button>
        ${isAdminMode ? `<button class="admin-delete-comment-btn" data-id="${c.id}">Delete</button>` : ''}
      </div>
      ${replyBoxHtml}
      ${repliesHtml}
    `;
    commentsList.appendChild(comment);
  });

  // Add click handlers for like/dislike buttons
  commentsList.querySelectorAll(".like-btn").forEach(btn => {
    btn.addEventListener("click", () => handleVote(btn.dataset.id, "like"));
  });
  commentsList.querySelectorAll(".dislike-btn").forEach(btn => {
    btn.addEventListener("click", () => handleVote(btn.dataset.id, "dislike"));
  });

  // Add click handlers for reply buttons (on comments)
  commentsList.querySelectorAll(".reply-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const commentId = btn.dataset.id;
      activeReplyId = activeReplyId === commentId ? null : commentId;
      activeReplyToReplyId = null; // Close any nested reply box
      renderComments();
    });
  });

  // Add click handlers for toggle replies buttons (top-level)
  commentsList.querySelectorAll(".toggle-replies-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const commentId = btn.dataset.id;
      if (expandedReplies.has(commentId)) {
        expandedReplies.delete(commentId);
      } else {
        expandedReplies.add(commentId);
      }
      renderComments();
    });
  });

  // Add click handlers for toggle nested replies buttons
  commentsList.querySelectorAll(".toggle-nested-replies-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const path = btn.dataset.path;
      if (expandedReplies.has(path)) {
        expandedReplies.delete(path);
      } else {
        expandedReplies.add(path);
      }
      renderComments();
    });
  });

  // Add click handlers for reply like/dislike buttons (using path)
  commentsList.querySelectorAll(".reply-like-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      handleReplyVote(btn.dataset.path, "like");
    });
  });
  commentsList.querySelectorAll(".reply-dislike-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      handleReplyVote(btn.dataset.path, "dislike");
    });
  });

  // Add click handlers for "Reply" button on replies
  commentsList.querySelectorAll(".reply-to-reply-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const path = btn.dataset.path;
      activeReplyToReplyId = activeReplyToReplyId === path ? null : path;
      activeReplyId = null; // Close any comment reply box
      renderComments();
    });
  });

  // Add click handlers for admin delete buttons (comments)
  if (isAdminMode) {
    commentsList.querySelectorAll(".admin-delete-comment-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        deleteComment(btn.dataset.id);
      });
    });

    // Add click handlers for admin delete buttons (replies)
    commentsList.querySelectorAll(".admin-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        deleteReply(btn.dataset.path);
      });
    });
  }

  // Add click handlers for nested reply cancel buttons
  commentsList.querySelectorAll(".nested-reply-cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeReplyToReplyId = null;
      renderComments();
    });
  });

  // Add click handlers for nested reply submit buttons
  commentsList.querySelectorAll(".nested-reply-submit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const path = btn.dataset.path;
      const parentReply = findReplyByPath(allComments, path);
      if (!parentReply) return;

      const replyArea = btn.closest(".reply-input-area");
      const nameInput = replyArea.querySelector(".reply-name-input");
      const textInput = replyArea.querySelector(".reply-text-input");

      const replyText = textInput.value.trim();
      if (!replyText) return;

      const replyName = nameInput.value.trim() || "Anonymous";

      if (!parentReply.replies) parentReply.replies = [];
      parentReply.replies.push({
        id: Date.now(), // Use timestamp as ID
        author: replyName,
        time: "Just now",
        text: replyText,
        likes: 0,
        dislikes: 0,
        userVote: null,
        replies: []
      });

      // Save to Firestore - update the entire comment's replies
      const commentId = path.split("-")[0];
      const comment = allComments.find(c => c.id === commentId);
      if (comment) {
        await updateComment(commentId, { replies: comment.replies });
      }

      // Expand this reply's nested replies so user sees their new reply
      expandedReplies.add(path);

      activeReplyToReplyId = null;
      renderComments();
    });
  });

  // Add click handlers for cancel reply buttons
  commentsList.querySelectorAll(".reply-cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeReplyId = null;
      renderComments();
    });
  });

  // Add click handlers for submit reply buttons
  commentsList.querySelectorAll(".reply-submit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const commentId = btn.dataset.id;
      const comment = allComments.find(c => c.id === commentId);
      if (!comment) return;

      const replyArea = btn.closest(".reply-input-area");
      const nameInput = replyArea.querySelector(".reply-name-input");
      const textInput = replyArea.querySelector(".reply-text-input");

      const replyText = textInput.value.trim();
      if (!replyText) return;

      const replyName = nameInput.value.trim() || "Anonymous";

      if (!comment.replies) comment.replies = [];
      const newReply = {
        id: Date.now(), // Use timestamp as ID for replies
        author: replyName,
        time: "Just now",
        text: replyText,
        likes: 0,
        dislikes: 0,
        userVote: null,
        replies: []
      };
      comment.replies.push(newReply);

      // Save to Firestore
      await updateComment(commentId, { replies: comment.replies });

      // Expand replies so user sees their new reply
      expandedReplies.add(commentId);

      activeReplyId = null;
      renderComments();
    });
  });

  // Update pagination controls
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
}

if (prevPageBtn) {
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderComments();
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(allComments.length / COMMENTS_PER_PAGE);
    if (currentPage < totalPages) {
      currentPage++;
      renderComments();
    }
  });
}

if (feedbackBtn && feedbackInput && commentsList) {
  feedbackBtn.addEventListener("click", async () => {
    const text = feedbackInput.value.trim();
    if (!text) return;

    const name = nameInput ? nameInput.value.trim() : "";
    const displayName = name || "Anonymous";

    // Save to Firestore
    const docId = await saveComment(displayName, text);
    if (docId) {
      // Add to beginning of comments array locally
      allComments.unshift({
        id: docId,
        author: displayName,
        time: "Just now",
        text: text,
        likes: 0,
        dislikes: 0,
        userVote: null,
        replies: []
      });

      // Go to first page and re-render
      currentPage = 1;
      renderComments();

      // Clear inputs
      feedbackInput.value = "";
      if (nameInput) nameInput.value = "";
    }
  });
}

// ------------------------------
// SORT FUNCTIONALITY
// ------------------------------
const sortBtn = document.getElementById("sort-btn");
const sortDropdown = document.getElementById("sort-dropdown");
const sortLabel = document.getElementById("sort-label");
let currentSortValue = "newest";

function sortComments() {
  if (currentSortValue === "newest") {
    // Sort by createdAt descending (newest first)
    allComments.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
  } else if (currentSortValue === "oldest") {
    // Sort by createdAt ascending (oldest first)
    allComments.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return aTime - bTime;
    });
  } else if (currentSortValue === "most-liked") {
    // Sort by likes descending
    allComments.sort((a, b) => b.likes - a.likes);
  } else if (currentSortValue === "most-disliked") {
    // Sort by dislikes descending
    allComments.sort((a, b) => b.dislikes - a.dislikes);
  } else if (currentSortValue === "most-replies") {
    // Sort by total reply count descending
    allComments.sort((a, b) => countAllReplies(b.replies) - countAllReplies(a.replies));
  }

  currentPage = 1;
  renderComments();
}

if (sortBtn && sortDropdown) {
  // Toggle dropdown on button click
  sortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sortBtn.classList.toggle("open");
    sortDropdown.classList.toggle("open");
  });

  // Handle option selection
  sortDropdown.querySelectorAll(".sort-option").forEach(option => {
    option.addEventListener("click", () => {
      const value = option.dataset.value;
      const label = option.textContent;

      // Update selected state
      sortDropdown.querySelectorAll(".sort-option").forEach(opt => opt.classList.remove("selected"));
      option.classList.add("selected");

      // Update button label
      sortLabel.textContent = label;
      currentSortValue = value;

      // Close dropdown
      sortBtn.classList.remove("open");
      sortDropdown.classList.remove("open");

      // Sort comments
      sortComments();
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!sortBtn.contains(e.target) && !sortDropdown.contains(e.target)) {
      sortBtn.classList.remove("open");
      sortDropdown.classList.remove("open");
    }
  });
}

// Initial load from Firestore
loadComments();
