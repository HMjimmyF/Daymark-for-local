/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/renderer/**/*.{js,jsx}', './index.html'],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: 'hsl(var(--card))',
                muted: 'hsl(var(--muted))',
                border: 'hsl(var(--border))',
                primary: 'hsl(var(--primary))',
                accent: 'hsl(var(--accent))',
                danger: 'hsl(var(--danger))'
            },
            borderRadius: {
                lg: 'var(--radius-lg)',
                md: 'var(--radius-md)',
                sm: 'var(--radius-sm)'
            }
        }
    },
    plugins: []
}
