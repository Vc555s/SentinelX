import { useEffect, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Language {
    code: string;
    name: string;
    nativeName: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
];

// Declare Google Translate types
declare global {
    interface Window {
        google: {
            translate: {
                TranslateElement: new (config: {
                    pageLanguage: string;
                    includedLanguages?: string;
                    autoDisplay?: boolean;
                }, elementId: string) => void;
            };
        };
        googleTranslateElementInit?: () => void;
    }
}

export function LanguageSelector() {
    const [currentLanguage, setCurrentLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize Google Translate
    useEffect(() => {
        // Check if script is already loaded
        if (document.getElementById('google-translate-script')) {
            setIsLoaded(true);
            return;
        }

        // Add Google Translate script
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;

        // Create hidden translate element
        const translateDiv = document.createElement('div');
        translateDiv.id = 'google_translate_element';
        translateDiv.style.display = 'none';
        document.body.appendChild(translateDiv);

        // Initialize Google Translate
        window.googleTranslateElementInit = () => {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: 'en',
                    includedLanguages: 'en,hi,mr,gu',
                    autoDisplay: false,
                },
                'google_translate_element'
            );
            setIsLoaded(true);
        };

        document.body.appendChild(script);

        // Add styles to hide Google Translate bar
        const style = document.createElement('style');
        style.textContent = `
      .goog-te-banner-frame { display: none !important; }
      body { top: 0 !important; }
      .goog-te-gadget { display: none !important; }
      .skiptranslate { display: none !important; }
      .goog-te-balloon-frame { display: none !important; }
    `;
        document.head.appendChild(style);

        return () => {
            // Cleanup - leave elements for persistence
        };
    }, []);

    // Get stored language preference
    useEffect(() => {
        const stored = localStorage.getItem('sentinelx_language');
        if (stored) {
            const lang = SUPPORTED_LANGUAGES.find(l => l.code === stored);
            if (lang) {
                setCurrentLanguage(lang);
                // Apply stored language after Google Translate loads
                setTimeout(() => triggerTranslation(lang.code), 1000);
            }
        }
    }, [isLoaded]);

    const triggerTranslation = (langCode: string) => {
        // Find Google Translate select element and change it
        const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (selectElement) {
            selectElement.value = langCode;
            selectElement.dispatchEvent(new Event('change'));
        } else {
            // Fallback: try to trigger via cookie
            const domain = window.location.hostname;
            if (langCode === 'en') {
                // Reset to original
                document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
                document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
                window.location.reload();
            } else {
                document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}`;
                document.cookie = `googtrans=/en/${langCode}; path=/`;
                window.location.reload();
            }
        }
    };

    const handleLanguageChange = (lang: Language) => {
        setCurrentLanguage(lang);
        localStorage.setItem('sentinelx_language', lang.code);
        triggerTranslation(lang.code);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Change Language"
                >
                    <Globe className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang)}
                        className="flex items-center justify-between"
                    >
                        <div>
                            <span className="font-medium">{lang.nativeName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{lang.name}</span>
                        </div>
                        {currentLanguage.code === lang.code && (
                            <Check className="w-4 h-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
