// frontend/src/components/CountdownTimer.jsx
import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';

const colombiaTimezone = "America/Bogota";

const calculateNextDrawTime = () => {
    const now = moment().tz(colombiaTimezone);
    let nextDraw = now.clone().day(7).hour(19).minute(0).second(0).millisecond(0); // Próximo Domingo 7 PM
    if (now.isAfter(nextDraw)) {
        nextDraw.add(1, 'week'); // Si ya pasó, ir al siguiente Domingo
    }
    return nextDraw;
};

const formatTimeLeft = (ms) => {
    if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);
    return {
        days: String(days).padStart(2, '0'), // Añadir padding
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0')
    };
};

const CountdownTimer = () => {
    const [nextDrawTime, setNextDrawTime] = useState(calculateNextDrawTime());
    const [timeLeft, setTimeLeft] = useState(nextDrawTime.diff(moment().tz(colombiaTimezone)));

    useEffect(() => {
        const timer = setInterval(() => {
            const next = calculateNextDrawTime();
            setNextDrawTime(next); // Recalcular por si cambia el día/hora
            setTimeLeft(next.diff(moment().tz(colombiaTimezone)));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedTime = formatTimeLeft(timeLeft);

    return (
        <div className="countdown-section"> {/* Contenedor específico */}
            <div className="countdown-timer card-texture"> {/* Aplicar textura si se desea */}
                <div className="countdown-label">Next Draw In</div>
                {timeLeft > 0 ? (
                    <div className="countdown-values">
                        <span>{formattedTime.days}<small>DAYS</small></span>
                        <span className="separator">:</span>
                        <span>{formattedTime.hours}<small>HRS</small></span>
                        <span className="separator">:</span>
                        <span>{formattedTime.minutes}<small>MIN</small></span>
                        <span className="separator">:</span>
                        <span>{formattedTime.seconds}<small>SEC</small></span>
                    </div>
                ) : (
                     // Mostrar mensaje cuando el sorteo está ocurriendo o acaba de ocurrir
                    <div className="countdown-values drawing-now">Drawing in Progress...</div>
                )}
                 <div className="countdown-target-time">
                   Target: Sundays @ 7:00 PM (Bogotá Time)
                   {/* Target: {nextDrawTime.format('ddd, MMM D, YYYY HH:mm')} */}
                 </div>
            </div>
        </div>
    );
};

export default CountdownTimer;