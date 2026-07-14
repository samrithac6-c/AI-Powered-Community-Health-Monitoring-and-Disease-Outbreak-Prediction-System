DB.seedIfNeeded();
Utils.redirectIfLoggedIn();

const form = document.getElementById('login-form');
const submitBtn = document.getElementById('login-submit');

function setFieldError(fieldId, hasError) {
  const el = document.getElementById(fieldId);
  el.classList.toggle('field--invalid', hasError);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const passwordValid = password.length > 0;

  setFieldError('field-email', !emailValid);
  setFieldError('field-password', !passwordValid);
  if (!emailValid || !passwordValid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';

  setTimeout(() => {
    const user = DB.verifyLogin(email, password);
    if (!user) {
      Toast.show('Incorrect email or password. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
      return;
    }
    DB.setSession(user.id);
    Toast.show(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
    setTimeout(() => {
      window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    }, 500);
  }, 350);
});
