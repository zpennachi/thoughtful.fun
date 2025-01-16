
// Initialize Supabase
const supabaseUrl = 'https://yofgrvatwtrdaulmrooi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZmdydmF0d3RyZGF1bG1yb29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NDM3MjIsImV4cCI6MjA1MjAxOTcyMn0.HqRANcQRziTI0WcVT9an6saceNnBorsDPwdD-RKDC88';
const mySupabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// UI Elements
const signInSection = document.getElementById('sign-in');
const loggedInSection = document.getElementById('logged-in');
const userEmailSpan = document.getElementById('user-email');
const uploadSection = document.getElementById('upload-section');

// Function to update UI based on authentication state
async function checkAuthState() {
  const { data: { user } } = await mySupabaseClient.auth.getUser();
  if (user) {
    // User is signed in
    userEmailSpan.textContent = `Yooooo whats up ${user.email}! Great to see u`;
    loggedInSection.classList.remove('hidden');
    signInSection.classList.add('hidden');
    uploadSection.classList.remove('hidden'); // Show upload section
  } else {
    // User is signed out
    userEmailSpan.textContent = '';
    loggedInSection.classList.add('hidden');
    signInSection.classList.remove('hidden');
    uploadSection.classList.add('hidden'); // Hide upload section
  }
}

// Check authentication state on page load
document.addEventListener('DOMContentLoaded', checkAuthState);

// Sign In
document.getElementById('signInButton').addEventListener('click', async () => {
  const email = document.getElementById('signInEmail').value;
  const password = document.getElementById('signInPassword').value;

  const { error } = await mySupabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert(error.message); // Show error if sign-in fails
  } else {
    await checkAuthState(); // Update UI after successful sign-in
  }
});

// Log Out
document.getElementById('logOutButton').addEventListener('click', async () => {
  await mySupabaseClient.auth.signOut();
  checkAuthState(); // Update UI after sign-out
});
async function populateDropdown() {
  const dropdown = document.getElementById('entryDropdown');
  dropdown.innerHTML = '<option value="" disabled selected>Select an entry</option>'; // Reset dropdown

  try {
    // Fetch all entries from the 365 table, sorted by ID
    const { data: entries, error } = await mySupabaseClient
      .from('365')
      .select('id, noun, file')
      .order('id', { ascending: true }); // Ensure a consistent order

    if (error) {
      console.error('Error fetching entries:', error.message);
      alert('Failed to fetch entries: ' + error.message);
      return;
    }

    if (entries.length === 0) {
      const noEntriesOption = document.createElement('option');
      noEntriesOption.textContent = 'No entries found.';
      noEntriesOption.disabled = true;
      dropdown.appendChild(noEntriesOption);
      return;
    }

    // Populate the dropdown
    entries.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id; // Use the ID as the value
      option.textContent = `${entry.id}: ${entry.noun}`;
      dropdown.appendChild(option);
    });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    alert('Unexpected error: ' + err.message);
  }
}

// Call populateDropdown on page load
document.addEventListener('DOMContentLoaded', populateDropdown);

document.getElementById('uploadForm').addEventListener('submit', async (event) => {
  event.preventDefault(); // Prevent default form submission

  const fileInput = document.getElementById('fileInput');
  const dropdown = document.getElementById('entryDropdown');
  const file = fileInput.files[0]; // Get the selected file
  const selectedId = dropdown.value; // Get the selected entry ID

  if (!file || !selectedId) {
    alert('Please select a file and an entry to add the file to.');
    return;
  }
console.log('Selected ID:', selectedId);
  try {
    // Generate a unique file path
    const filePath = `uploads/${Date.now()}_${file.name}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await mySupabaseClient.storage
      .from('portfolio-uploads')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError.message);
      alert('File upload failed: ' + uploadError.message);
      return;
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = mySupabaseClient.storage
      .from('portfolio-uploads')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;

    console.log('File URL:', fileUrl); // Debugging

    // Fetch current file array
    const { data: currentData, error: fetchError } = await mySupabaseClient
      .from('365')
      .select('file')
      .eq('id', selectedId)
      .single();

    if (fetchError) {
      console.error('Error fetching current file data:', fetchError.message);
      alert('Failed to fetch current file data: ' + fetchError.message);
      return;
    }

    // Initialize the array if it's null
    const updatedFileUrls = currentData.file ? [...currentData.file] : [];
    updatedFileUrls.push(fileUrl); // Append the new file URL

    // Update the row in the database
    const { data: updateData, error: updateError } = await mySupabaseClient
      .from('365')
      .update({ file: updatedFileUrls }) // Update the file array
      .eq('id', selectedId);

    if (updateError) {
      console.error('Error updating record:', updateError.message);
      alert('Failed to update entry: ' + updateError.message);
      return;
    }

    console.log('Update Response:', updateData); // Debugging
    alert('File uploaded and added to the selected entry successfully!');
  } catch (err) {
    console.error('Unexpected error:', err.message);
    alert('Unexpected error: ' + err.message);
  }
});
async function loadEntries() {
  const entriesList = document.getElementById('entries-list');
  entriesList.innerHTML = ''; // Clear any existing content

  try {
    const { data: entries, error } = await mySupabaseClient
      .from('365')
      .select('id, noun, description, file') // Fetch all fields
      .not('file', 'is', null) // Exclude rows with no files
      .neq('file', '{}') // Exclude rows with empty arrays
      .order('id', { ascending: false }); // Sort by ID descending

    if (error) {
      console.error('Error fetching entries:', error.message);
      alert('Failed to load entries: ' + error.message);
      return;
    }

    if (entries.length === 0) {
      entriesList.innerHTML = '<li>No entries with files found.</li>';
      return;
    }

    entries.forEach((entry) => {
      const entryItem = document.createElement('li');
      entryItem.classList.add('entry-item');

      // Calculate the date
      const baseDate = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
      const entryDate = new Date(baseDate);
      entryDate.setDate(baseDate.getDate() + (entry.id - 1)); // Add (id - 1) days

      // Format the date
      const formattedDate = entryDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });


      // Add content
      const idElement = document.createElement('p');
      idElement.textContent = `ID: ${entry.id}`;
      idElement.style.fontWeight = 'bold';

 

      const noun = document.createElement('h3');
      noun.textContent = entry.noun;

      const description = document.createElement('p');
      description.textContent = entry.description;

      const filesContainer = document.createElement('div');
      filesContainer.classList.add('files-container');

      // Render other files
      entry.file.forEach((fileUrl) => {
        if (!fileUrl.endsWith('.glb') && !fileUrl.endsWith('.gltf')) {
          const fileElement = renderFile(fileUrl);
          filesContainer.appendChild(fileElement);
        }
      });

      // Append content
      entryItem.appendChild(idElement);
      entryItem.appendChild(noun);
      entryItem.appendChild(description);
      entryItem.appendChild(filesContainer);

      // Add entry to the list
      entriesList.appendChild(entryItem);
    });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    alert('Unexpected error: ' + err.message);
  }
}

// Function to render image thumbnails and attach lightbox
function renderFile(fileUrl, entryId, index) {
  const fileExtension = fileUrl.split('.').pop().toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExtension)) {
    const columnDiv = document.createElement('div');
    columnDiv.classList.add('column');

    const img = document.createElement('img');
    img.src = fileUrl;
    img.alt = `Image ${index + 1} for Entry ${entryId}`;
    img.classList.add('hover-shadow');
    img.onclick = () => {
      openModal(entryId);
      currentSlide(index + 1, entryId);
    };

    columnDiv.appendChild(img);
    return columnDiv;
  }

  // Handle non-image files
  return renderNonImageFile(fileUrl);
}

function renderNonImageFile(fileUrl) {
  const fileExtension = fileUrl.split('.').pop().toLowerCase();

  if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
    const audio = document.createElement('audio');
    audio.src = fileUrl;
    audio.controls = true;
    return audio;
  }

  if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
    const video = document.createElement('video');
    video.src = fileUrl;
    video.controls = true;
    video.style.maxWidth = '300px';
    return video;
  }

  const link = document.createElement('a');
  link.href = fileUrl;
  link.textContent = '';
  link.target = '_blank';
  link.style.display = 'block';
  link.style.margin = '10px';
  return link;
}

// Function to dynamically load entries and their lightboxes
async function loadEntries() {
  const entriesList = document.getElementById('entries-list');
  entriesList.innerHTML = ''; // Clear existing content

  try {
    const { data: entries, error } = await mySupabaseClient
      .from('365')
      .select('id, noun, description, file')
      .not('file', 'is', null)
      .neq('file', '{}')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error.message);
      alert('Failed to load entries: ' + error.message);
      return;
    }

    if (entries.length === 0) {
      entriesList.innerHTML = '<li>No entries with files found.</li>';
      return;
    }

    entries.forEach((entry) => {
      const entryItem = document.createElement('li');
      entryItem.classList.add('entry-item');

      const idElement = document.createElement('p');
      idElement.textContent = `ID: ${entry.id}`;
      idElement.style.fontWeight = 'bold';

      const noun = document.createElement('h3');
      noun.textContent = entry.noun;

      const description = document.createElement('p');
      description.textContent = entry.description;

      const filesContainer = document.createElement('div');
      filesContainer.classList.add('files-container');

      const modalDiv = createModal(entry);

      // Render files and append to container
      entry.file.forEach((fileUrl, index) => {
        const fileElement = renderFile(fileUrl, entry.id, index);
        filesContainer.appendChild(fileElement);
      });
      
entry.file.forEach((fileUrl) => {
    if (fileUrl.endsWith('.glb') || fileUrl.endsWith('.gltf')) {
        const modelViewer = document.createElement('model-viewer');
        modelViewer.src = fileUrl;
        modelViewer.alt = '3D Model';
        modelViewer.autoplay = true;
      modelViewer.disableZoom = true;
        modelViewer.autoRotate = true;
        modelViewer.cameraControls = true;
        modelViewer.style.position = 'relative';
      modelViewer.setAttribute('interaction-prompt', 'none');
        modelViewer.style.top = '0';
        modelViewer.style.left = '0';
        modelViewer.style.width = '100%';
      modelViewer.style.maxWidth = '900px';
        modelViewer.style.height = '100vh';
        modelViewer.style.zIndex = '11';
        entryItem.appendChild(modelViewer);
    }
});

      // Append content
      entryItem.appendChild(idElement);
      entryItem.appendChild(noun);
      entryItem.appendChild(description);
      entryItem.appendChild(filesContainer);
      entryItem.appendChild(modalDiv);

      entriesList.appendChild(entryItem);
    });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    alert('Unexpected error: ' + err.message);
  }
}

// Function to create the modal structure for a lightbox
function createModal(entry) {
  const modal = document.createElement('div');
  modal.id = `modal-${entry.id}`;
  modal.classList.add('modal');

  const closeBtn = document.createElement('span');
  closeBtn.classList.add('close', 'cursor');
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => closeModal(entry.id);

  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');

  entry.file.forEach((fileUrl, index) => {
    const slideDiv = document.createElement('div');
    slideDiv.classList.add('mySlides', `entry-${entry.id}`);
    slideDiv.style.display = 'none';

    const numberText = document.createElement('div');
    numberText.classList.add('numbertext');
    numberText.textContent = `${index + 1} / ${entry.file.length}`;

    const img = document.createElement('img');
    img.src = fileUrl;
    img.style.width = '100%';

    slideDiv.appendChild(numberText);
    slideDiv.appendChild(img);
    modalContent.appendChild(slideDiv);
  });

  const prevBtn = document.createElement('a');
  prevBtn.classList.add('prev');
  prevBtn.innerHTML = '&#10094;';
  prevBtn.onclick = () => plusSlides(-1, entry.id);

  const nextBtn = document.createElement('a');
  nextBtn.classList.add('next');
  nextBtn.innerHTML = '&#10095;';
  nextBtn.onclick = () => plusSlides(1, entry.id);

  modal.appendChild(closeBtn);
  modal.appendChild(modalContent);
  modal.appendChild(prevBtn);
  modal.appendChild(nextBtn);

  return modal;
}

// Lightbox controls
function openModal(entryId) {
  document.getElementById(`modal-${entryId}`).style.display = 'block';
}

function closeModal(entryId) {
  document.getElementById(`modal-${entryId}`).style.display = 'none';
}

function plusSlides(n, entryId) {
  const slides = document.querySelectorAll(`.entry-${entryId}`);
  let currentIndex = Array.from(slides).findIndex(
    (slide) => slide.style.display === 'block'
  );

  currentIndex = (currentIndex + n + slides.length) % slides.length;

  slides.forEach((slide) => (slide.style.display = 'none'));
  slides[currentIndex].style.display = 'block';
}

function currentSlide(n, entryId) {
  const slides = document.querySelectorAll(`.entry-${entryId}`);
  slides.forEach((slide) => (slide.style.display = 'none'));
  slides[n - 1].style.display = 'block';
}

// Initialize entries on page load
document.addEventListener('DOMContentLoaded', () => {
  loadEntries();
});

document.getElementById('showSignInButton').addEventListener('click', () => {
  const authSection = document.getElementById('auth-section');
  const loginButton = document.getElementById('showSignInButton');

  // Show the sign-in section
  authSection.classList.remove('hidden');

  // Optionally hide the "Login :)" button
  loginButton.classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 0);
        const diff = today - startOfYear;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        // Fetch today's prompt
        const { data: promptEntry, error } = await mySupabaseClient
            .from('365')
            .select('noun, description')
            .eq('id', dayOfYear)
            .single();

        if (error || !promptEntry) {
            console.error('Error fetching today\'s prompt:', error?.message || 'No data found');
            document.getElementById('todays-prompt').textContent = 'No prompt found for today!';
            return;
        }

        // Display the noun and description
        const promptNoun = document.getElementById('prompt-noun');
        const promptDescription = document.getElementById('prompt-description');
        promptNoun.textContent = `Today's Prompt: ${promptEntry.noun}`;
        promptDescription.textContent = promptEntry.description;
        promptDescription.style.fontStyle = 'italic';

        console.log('Prompt Entry:', promptEntry); // Debugging

    } catch (err) {
        console.error('Unexpected error:', err.message);
        document.getElementById('todays-prompt').textContent = 'Error loading today\'s prompt!';
    }
});
