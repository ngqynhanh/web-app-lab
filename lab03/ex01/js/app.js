let allCourses = []; 
let filteredCourses = []; 
let currentCategory = 'all'; 
let searchTerm = ''; 
 
// Fetch courses from JSON file
async function fetchCourses() { 
    try { 
        const response = await fetch('data/courses.json'); 
        if (!response.ok) { 
            throw new Error(`HTTP error! status: ${response.status}`); 
        } 
        const courses = await response.json(); 
        return courses; 
    } catch (error) { 
        console.error('Error fetching courses:', error); 
        throw error; 
    } 
}

// Create HTML for a course card 
function createCourseCard(course) { 
    const card = document.createElement('div'); 
    card.classList.add('course-card'); 
     
    // Add low-seats class if needed 
    if (course.seats < 10) { 
        card.classList.add('low-seats'); 
    } 
     
    card.innerHTML = ` 
        <h3>${course.code} - ${course.title}</h3> 
        <div class="course-meta"> 
            <div><strong>Instructor:</strong> ${course.instructor}</div> 
            <div><strong>Schedule:</strong> ${course.schedule}</div> 
            <div><strong>Credits:</strong> ${course.credits}</div> 
        </div> 
        <div class="course-description"> 
            <p>${course.description}</p> 
        </div> 
        <div class="course-footer"> 
            <span class="course-seats ${course.seats < 10 ? 'low' : ''}"> 
                ${course.seats} seats available 
            </span> 
            <button class="btn" data-course="${course.code}">View Details</button> 
        </div> 
    `; 
     
    return card; 
} 
 
// Display courses in the DOM 
function displayCourses(courses) { 
    const container = document.getElementById('course-list'); 
    const resultsInfo = document.getElementById('results-info'); 
        // Clear existing content 
    container.innerHTML = ''; 
     
    // Update results info 
    resultsInfo.textContent = `Showing ${courses.length} course(s)`; 
     
    // Check if empty 
    if (courses.length === 0) { 
        container.innerHTML = '<p class="empty-state">No courses found</p>'; 
        return; 
    } 
     
    // Create and append cards 
    courses.forEach(course => { 
        const card = createCourseCard(course); 
        container.appendChild(card); 
    }); 
} 

// Filter courses based on search and category 
function filterCourses() { 
    filteredCourses = allCourses.filter(course => { 
        // Category filter 
        const categoryMatch = currentCategory === 'all' ||  
                            course.category === currentCategory; 
         
        // Search filter 
        const searchLower = searchTerm.toLowerCase(); 
        const searchMatch = searchTerm === '' || 
                          course.code.toLowerCase().includes(searchLower) || 
                          course.title.toLowerCase().includes(searchLower) || 
                          course.instructor.toLowerCase().includes(searchLower); 
         
        return categoryMatch && searchMatch; 
    }); 
     
    displayCourses(filteredCourses); 
} 
 
// Handle search input 
function handleSearch(event) { 
    searchTerm = event.target.value; 
    filterCourses(); 
} 
 
// Handle category filter 
function handleCategoryFilter(event) { 
    if (!event.target.classList.contains('filter-btn')) return; 
        // Update active button 
    document.querySelectorAll('.filter-btn').forEach(btn => { 
        btn.classList.remove('active'); 
    }); 
    event.target.classList.add('active'); 
     
    // Update current category 
    currentCategory = event.target.dataset.category; 
     
    // Filter courses 
    filterCourses(); 
} 
 
// Handle view details button 
function handleViewDetails(event) { 
    if (!event.target.matches('button[data-course]')) return; 
     
    const courseCode = event.target.dataset.course; 
    const course = allCourses.find(c => c.code === courseCode); 
     
    if (course) { 
        // For now, just alert (students can enhance this) 
        alert(`Course Details:\n\n${course.code} - ${course.title}\n\nInstructor: 
${course.instructor}\nSchedule: ${course.schedule}\nCredits: ${course.credits}\nSeats: 
${course.seats}\n\nPrerequisites: ${course.prerequisites.join(', ')}\n\nDescription: 
${course.description}`); 
    } 
} 

// Initialize the application 
async function init() { 
    const courseList = document.getElementById('course-list'); 
     
    // Show loading state 
    courseList.innerHTML = '<div class="loading">Loading courses...</div>'; 
     
    try { 
        // Fetch courses 
        allCourses = await fetchCourses(); 
        filteredCourses = allCourses; 
         
        // Display courses 
        displayCourses(filteredCourses); 
         
        // Set up event listeners 
        const searchInput = document.getElementById('search-input'); 
        searchInput.addEventListener('input', handleSearch); 
         
        const filtersContainer = document.querySelector('.filters');

        filtersContainer.addEventListener('click', handleCategoryFilter); 
         
        const courseListEl = document.getElementById('course-list'); 
        courseListEl.addEventListener('click', handleViewDetails); 
         
    } catch (error) { 
        courseList.innerHTML = ` 
            <div class="error"> 
                <p>Failed to load courses: ${error.message}</p> 
                <button class="btn" onclick="init()">Retry</button> 
            </div> 
        `; 
    } 
} 
 
// Start the app when DOM is ready 
document.addEventListener('DOMContentLoaded', init); 