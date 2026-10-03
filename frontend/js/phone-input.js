(function() {
  var libraryVersion = '19.5.6';

  window.initializeInternationalPhoneInput = function(input) {
    if (!input || typeof window.intlTelInput !== 'function') return null;
    return window.intlTelInput(input, {
      initialCountry: 'mw',
      preferredCountries: ['mw', 'za', 'zm', 'tz', 'gb', 'us'],
      separateDialCode: true,
      nationalMode: true,
      autoPlaceholder: 'aggressive',
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@' + libraryVersion + '/build/js/utils.js'
    });
  };

  window.internationalPhoneError = function(phoneInput) {
    var utils = window.intlTelInputUtils;
    var errorCode = phoneInput && phoneInput.getValidationError ? phoneInput.getValidationError() : null;
    if (utils && utils.validationError) {
      if (errorCode === utils.validationError.TOO_SHORT) return 'This phone number is too short for the selected country.';
      if (errorCode === utils.validationError.TOO_LONG) return 'This phone number is too long for the selected country.';
      if (errorCode === utils.validationError.INVALID_COUNTRY_CODE) return 'Choose a valid country code.';
      if (errorCode === utils.validationError.NOT_A_NUMBER) return 'Enter digits for the selected country.';
    }
    return 'This phone number is invalid for the selected country. Check the country code and digits.';
  };
})();