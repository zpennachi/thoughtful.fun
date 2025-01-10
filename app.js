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
    userEmailSpan.textContent = `Welcome, ${user.email}!`;
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

      // Add <model-viewer> as the background if a .glb/.gltf file exists
      if (entry.file.some((url) => url.endsWith('.glb') || url.endsWith('.gltf'))) {
        const modelUrl = entry.file.find((url) => url.endsWith('.glb') || url.endsWith('.gltf'));
        const modelViewer = document.createElement('model-viewer');
        modelViewer.src = modelUrl;
        modelViewer.alt = '3D Model';
        modelViewer.autoplay = true;
        modelViewer.cameraControls = true;
        modelViewer.autoRotate = true;
        modelViewer.setAttribute('camera-orbit', '0deg 75deg 1.5m');
        modelViewer.setAttribute('min-camera-orbit', 'auto auto 1m');
        modelViewer.setAttribute('interaction-prompt', 'none');
        modelViewer.style.position = 'absolute';
        modelViewer.style.top = '0';
        modelViewer.style.left = '0';
        modelViewer.style.width = '100%';
        modelViewer.style.height = '100%';
        modelViewer.style.zIndex = '-1';
        modelViewer.style.objectFit = 'cover';
        entryItem.appendChild(modelViewer);
      }

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

function renderFile(fileUrl) {
  const fileExtension = fileUrl.split('.').pop().toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExtension)) {
    // Render image
    const img = document.createElement('img');
    img.src = fileUrl;
    img.alt = 'Image file';
    img.style.maxWidth = '200px';
    img.style.margin = '10px';
    return img;
  }

  if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
    // Render audio
    const audio = document.createElement('audio');
    audio.src = fileUrl;
    audio.controls = true;
    audio.style.margin = '10px';
    return audio;
  }

  if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
    // Render video
    const video = document.createElement('video');
    video.src = fileUrl;
    video.controls = true;
    video.style.maxWidth = '300px';
    video.style.margin = '10px';
    return video;
  }

  // Skip .glb/.gltf files (handled as background in loadEntries)

  // Render non-media file as a URL
  const link = document.createElement('a');
  link.href = fileUrl;
  link.textContent = 'Download File';
  link.target = '_blank';
  link.style.display = 'block';
  link.style.margin = '10px';
  return link;
}


document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get today's date
    const today = new Date();

    // Calculate the day of the year (1 = Jan 1, 2 = Jan 2, etc.)
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24; // Milliseconds in a day
    const dayOfYear = Math.floor(diff / oneDay);

    // Fetch the corresponding entry for today's date
    const { data: promptEntry, error } = await mySupabaseClient
      .from('365')
      .select('noun, description')
      .eq('id', dayOfYear)
      .single(); // We expect only one result

    if (error) {
      console.error('Error fetching today\'s prompt:', error.message);
      document.getElementById('todays-prompt').textContent = 'No prompt found for today!';
      return;
    }

    // Display the noun and description for today's date
    const promptNoun = document.getElementById('prompt-noun');
    const promptDescription = document.getElementById('prompt-description');
    promptNoun.textContent = `todays prompt: ${promptEntry.noun}`;
    promptDescription.textContent = ` ${promptEntry.description}`;
      promptDescription.style.fontStyle = 'italic';

    // Load the entries as usual
    loadEntries();
  } catch (err) {
    console.error('Unexpected error:', err.message);
    document.getElementById('todays-prompt').textContent = 'Error loading today\'s prompt!';
  }
});
