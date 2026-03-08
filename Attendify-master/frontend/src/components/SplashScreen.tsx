import { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [isSplitting, setIsSplitting] = useState(false);

    useEffect(() => {
        // Wait for 1.5s then start splitting
        const timer1 = setTimeout(() => {
            setIsSplitting(true);
        }, 1500);

        // Wait for animation frame (0.8s) then finish
        const timer2 = setTimeout(() => {
            onFinish();
        }, 2300); // 1500 + 800

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [onFinish]);

    return (
        <div className={`splash-screen ${isSplitting ? 'split' : ''}`}>
            <div className="half left-half"></div>
            <div className="half right-half"></div>
            <div className="splash-content">
                <img src="/logo.png" alt="Attendify" className="splash-logo" />
                <h1>Attendify</h1>
            </div>
        </div>
    );
};

export default SplashScreen;
