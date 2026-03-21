(function () {
    const form = document.querySelector('.sign-in-form');
    const emailField = form ? form.querySelector('input[type="email"]') : null;
    const submitButton = form ? form.querySelector('input[type="submit"]') : null;

    if (!form || !emailField || !submitButton) {
        return;
    }

    form.addEventListener('submit', function (event) {
        if (!emailField.checkValidity()) {
            event.preventDefault();
            emailField.reportValidity();
            return;
        }

        event.preventDefault();
        submitButton.value = 'Reset Link Sent';
        submitButton.disabled = true;
        emailField.readOnly = true;
    });
})();
