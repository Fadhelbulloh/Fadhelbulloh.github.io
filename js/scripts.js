function showPopup(projectId) {
    const popup = document.getElementById('popup');
    const popupContent = document.getElementById('popup-content');

    // Clear previous content
    popupContent.innerHTML = '';

    // Add content based on the projectId
    if (projectId === 'project1') {
        popupContent.innerHTML = `
            <h2>Project 1</h2>
            <p>Detailed information about Project 1.</p>
            <img src="images/project1-detail.jpg" alt="Project 1 Details">
        `;
    } else if (projectId === 'project2') {
        popupContent.innerHTML = `
            <h2>Project 2</h2>
            <p>Detailed information about Project 2.</p>
            <img src="images/project2-detail.jpg" alt="Project 2 Details">
        `;
    }

    popup.style.display = 'flex';
}

function hidePopup() {
    document.getElementById('popup').style.display = 'none';
}

$(document).ready(function(){
    $(".navbar .nav-link").on('click', function(event) {

        if (this.hash !== "") {

            event.preventDefault();

            var hash = this.hash;

            $('html, body').animate({
                scrollTop: $(hash).offset().top
            }, 700, function(){
                window.location.hash = hash;
            });
        } 
    });
});

// navbar toggle
$('#nav-toggle').click(function(){
    $(this).toggleClass('is-active')
    $('ul.nav').toggleClass('show');
});