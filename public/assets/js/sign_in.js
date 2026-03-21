(function () {
    const primaryAction = document.querySelector('.app-form a.btn.btn-primary');
    const passwordFields = [
        document.querySelector('#password1'),
        document.querySelector('#password2')
    ].filter(Boolean);

    if (!primaryAction || passwordFields.length !== 2) {
        return;
    }

    const [newPasswordField, confirmPasswordField] = passwordFields;

    function syncValidity() {
        const bothFilled = newPasswordField.value.trim() !== '' && confirmPasswordField.value.trim() !== '';
        const matches = newPasswordField.value === confirmPasswordField.value;

        newPasswordField.setCustomValidity('');
        confirmPasswordField.setCustomValidity('');

        if (!bothFilled) {
            confirmPasswordField.setCustomValidity('Please fill in both password fields.');
            return false;
        }

        if (!matches) {
            confirmPasswordField.setCustomValidity('Passwords do not match.');
            return false;
        }

        return true;
    }

    passwordFields.forEach(function (field) {
        field.addEventListener('input', syncValidity);
    });

    primaryAction.addEventListener('click', function (event) {
        if (!syncValidity()) {
            event.preventDefault();
            confirmPasswordField.reportValidity();
        }
    });
})();
