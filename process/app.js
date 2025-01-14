
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

        // Load the entries list after displaying today's prompt
        loadEntries();
    }    }
});
