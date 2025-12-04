// Security Utility: Sanitize HTML input
const Security = {
    sanitize: (str) => {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
};

// Expose to window
window.Security = Security;
