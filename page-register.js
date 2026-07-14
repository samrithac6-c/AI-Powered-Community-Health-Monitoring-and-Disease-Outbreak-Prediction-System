DB.seedIfNeeded();
Utils.redirectIfLoggedIn();

const form = document.getElementById('register-form');
const submitBtn = document.getElementById('register-submit');

function setFieldError(fieldId, hasError) {
  document.getElementById(fieldId).classList.toggle('field--invalid', hasError);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const age = document.getElementById('age').value;
  const gender = document.getElementById('gender').value;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;

  const nameValid = name.length >= 2;
  const ageValid = age && Number(age) >= 1 && Number(age) <= 120;
  const genderValid = !!gender;
  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const passwordValid = password.length >= 8;
  const confirmValid = password === confirm && confirm.length > 0;

  setFieldError('field-name', !nameValid);
  setFieldError('field-age', !ageValid);
  setFieldError('field-gender', !genderValid);
  setFieldError('field-email', !emailValid);
  setFieldError('field-password', !passwordValid);
  setFieldError('field-confirm', !confirmValid);

  if (![nameValid, ageValid, genderValid, emailValid, passwordValid, confirmValid].every(Boolean)) {
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  setTimeout(() => {
    try {
      const user = DB.createUser({ name, email, password, age, gender, role: 'user' });
      DB.setSession(user.id);
      Toast.show('Account created! Welcome to CommunityHealth AI.', 'success');
      setTimeout(() => (window.location.href = 'dashboard.html'), 500);
    } catch (err) {
      Toast.show(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  }, 350);
});
