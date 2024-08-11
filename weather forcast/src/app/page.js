'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/globals.css';

export default function Home() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState([]);
  const [currentData, setCurrentData] = useState({});
  const [hourlyData, setHourlyData] = useState([]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Hava durumu kodlarına göre ikon dosya isimlerini tutar
  const  iconMapping = {
    2: { day: 'thunderstorm-day.png', night: 'thunderstorm-night.png' }, // 2xx grubu için simge
    3: { day: 'shower-rain.png', night:'shower-rain.png' }, // 3xx grubu için simge
    6: { day: 'snow.png', night: 'snow.png' }, // 6xx grubu için simge
    7: { day: 'mist.png', night: 'mist.png' }, // 7xx grubu için simge (mist, smoke, etc.)

    500: { day: 'rain-day.png', night: 'rain-night.png' }, // 500 için simge (light rain)
    501: { day: 'rain-day.png', night: 'rain-night.png' }, // 501 için simge (moderate rain)
    502: { day: 'rain-day.png', night: 'rain-night.png' }, // 502 için simge (heavy rain)
    503: { day: 'rain-day.png', night: 'rain-night.png' }, // 503 için simge (very heavy rain)
    504: { day: 'rain-day.png', night: 'rain-night.png' }, // 504 için simge (extreme rain)

    511: { day: 'snow.png', night: 'snow.png' }, // 511 için simge (freezing rain)

    520: { day: 'shower-rain-day.png', night: 'shower-rain.png' }, // 520 için simge (light shower rain)
    521: { day: 'shower-rain-day.png', night: 'shower-rain.png' }, // 521 için simge (shower rain)
    522: { day: 'shower-rain-day.png', night: 'shower-rain.png' }, // 522 için simge (heavy shower rain)
    531: { day: 'shower-rain-day.png', night: 'shower-rain.png' }, // 531 için simge (ragged shower rain)

    800: { day: 'clear-sky-day.png', night: 'clear-sky-night.png' }, // 800 için simge (açık hava)
    801: { day: 'few-clouds-day.png', night: 'few-clouds-night.png' }, // 801 için simge (az bulutlu)
    802: { day: 'scattered-clouds.png', night: 'scattered-clouds.png' }, // 802 için simge (dağınık bulutlar)
    803: { day: 'broken-clouds.png', night: 'broken-clouds.png' }, // 803 için simge (parçalı bulutlar)
    804: { day: 'broken-clouds.png', night: 'broken-clouds.png' }, // 804 için simge (kapalı bulutlar)
    
  };

  //Günün saatine, gün doğumu ve gün batımı saatlerine göre gündüz mü gece mi olduğunu belirler.
  const isDaytime = (currentHour, sunrise, sunset) => {
    return currentHour >= sunrise && currentHour < sunset;
  };
  
  // ID ve günün saati (gündüz/gece) bilgisine göre ikon URL'sini döner
  const getIconUrl = (weatherId, isDaytime) => {
    const specificIcon = iconMapping[weatherId]; // Belirli bir ID için simge arama
    const groupIcon = iconMapping[Math.floor(weatherId / 100)]; // Grup numarasına göre simge arama
    const iconFileName = specificIcon || groupIcon; // Belirli bir ID yoksa, grup simgesini kullan
    if (iconFileName) 
    {
      const iconFile = isDaytime ? iconFileName.day : iconFileName.night;
      return `/icons/${iconFile}`;
    }
    return '/icons/default-icon.png';
  };
  
  const getCurrentHour = () => new Date().getHours();

  const getHumidityDescription = (humidity) => {
     if (humidity <= 30) {
       return 'Çok Kuru';
      } else if (humidity <= 50) {
        return 'Kuru';
      } else if (humidity <= 70) {
        return 'Normal';
      } else if (humidity <= 85) {
        return 'Nemli';
      } else {
        return 'Çok Nemli';
      }
    };
    const getDayOfWeek = (dateString) => {
      // Tarih string'ini 'DD.MM.YYYY' formatından 'YYYY-MM-DD' formatına dönüştür
      const [day, month, year] = dateString.split('.').map(Number);
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
     
      const date = new Date(formattedDate);
    
      
      const dayName = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' }).format(date);
      
      return dayName;
    };
  
  //Belirli enlem ve boylam için hava durumu ve UV endeksi gibi verileri OpenWeatherMap API'sinden alır.
  //Ardından bu verileri uygun state'lere atar
  const fetchWeatherData = async (lat, lon) => {

    setError(null);

    try {

      //Hava Durumu Verileri İsteği:
      const currentResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric`);
      console.log('API Response:', currentResponse.data);
      const { main, visibility, weather: weatherDesc, sys, wind, rain, name } = currentResponse.data;
      
      const weatherId = weatherDesc[0].id; // weather ID'si buradan elde edilir
     
      const iconUrl = getIconUrl(weatherId, isDaytime); 

      //UV Endeksi Verileri İsteği:
      const uvResponse = await axios.get(`https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`);
      const uvIndex = uvResponse.data.value;

      //Yağış Miktarını Hesaplama:Son bir saat içinde düşen yağış miktarını ve bunu yüzde cinsinden hesaplar
      const rainAmount = rain ? rain['1h'] || 0 : 0;
      const rainPercentage = rainAmount > 0 ? Math.min(100, rainAmount * 10) : 0;
  
      //Güneş Doğumu ve Batımı Zamanlarını Hesaplama:
      //Güneş doğumu ve batımı saatlerini alır ve şu anki saatle karşılaştırarak günün hangi kısmında olduğunuzu belirler
      const sunriseDate = new Date(sys.sunrise * 1000);
      const sunsetDate = new Date(sys.sunset * 1000);
      const sunriseHour = sunriseDate.getHours();
      const sunsetHour = sunsetDate.getHours();
      const currentHour = new Date().getHours();
      const daytime = isDaytime(currentHour, sunriseHour, sunsetHour);

      const windSpeedKmH = (wind.speed * 3.6).toFixed(2); // m/s -> km/h dönüşümü

      

      //state'i, konum bilgisini saklar ve gösterir.
      setLocation(`${name}, ${sys.country}`);

      const humudityDescription= getHumidityDescription(main.humidity);

      //hava durumu verilerini saklar ve kullanıcı arayüzünde bu verilerin gösterilmesini sağlar.
      setCurrentData({
        humidity: Math.round(main.humidity),
        visibility: (visibility / 1000).toFixed(2),
        uvIndex: uvIndex.toFixed(2),
        weather: weatherDesc[0].description,
        sunrise: sunriseDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        sunset: sunsetDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        windSpeed: windSpeedKmH,
        rainPercentage: rainPercentage.toFixed(0),
        isDaytime: daytime,
        weatherId: weatherId, // Hava durumu ID'si
        temperature: main.temp, // Mevcut sıcaklık
        HumidityDescription: humudityDescription
      });
  
      //Saatlik hava durumu verilerini alır ve düzenler.
      const forecastResponse = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric`);
      const hourlyData = forecastResponse.data.list.slice(0, 9).map(data => {
        const hourDate = new Date(data.dt * 1000);
        const hour = hourDate.getHours();
        const isDaytimeHour = isDaytime(hour, sunriseHour, sunsetHour);
        const weatherId = data.weather[0].id;   
        const weatherDescription = data.weather[0].description; 

       
        return {
          time: hourDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          temperature: Math.round(data.main.temp),
          weatherID:weatherId,
          weatherDescription: weatherDescription,
          isDaytime: isDaytimeHour
        };
      });
      setHourlyData(hourlyData);
  
      //Günlük Hava Durumu Verilerini Alma:
      const dailyData = [];
      const dataList = forecastResponse.data.list;
      const dates = [...new Set(dataList.map(item => new Date(item.dt * 1000).toLocaleDateString('tr-TR')))];
      dates.forEach(date => {
        const dailyForecast = dataList.filter(item => new Date(item.dt * 1000).toLocaleDateString('tr-TR') === date);
        const dayData = {
          date: date,
          dayOfWeek: getDayOfWeek(date),
          minTemp: Math.min(...dailyForecast.map(item => item.main.temp_min)),
          maxTemp: Math.max(...dailyForecast.map(item => item.main.temp_max)),
          weatherId: dailyForecast[0].weather[0].id, 
          weatherDescription: dailyForecast[0].weather[0].description,
        };
        dailyData.push(dayData);
      });

      //Günlük hava durumu verilerini alır ve düzenler, ilk 5 gün için filtreler.
      const filteredDailyData = dailyData.slice(1, 6);
      console.log(filteredDailyData); // Verinin doğru olduğundan emin olun
      setWeather(filteredDailyData);
  
      //Yüklenme durumunu günceller ve bir hata durumunda uygun hata mesajını ayarlar.
      setLoading(false);
    } catch (error) {
      setError('Hava durumu verileri alınamadı.');
      setLoading(false);
    }
  };

  useEffect(() => {

    // Kullanıcının geçerli konumunu alır ve bu konuma göre hava durumu verilerini getirir.
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            const { latitude, longitude } = position.coords;
            fetchWeatherData(latitude, longitude);
          },
          error => {
            console.error('Geolocation error:', error);
            setError('Konum bilgisi alınamadı.');
            setLoading(false);
          }
        );
      } else {
        setError('Tarayıcınız konum bilgisi desteklemiyor.');
        setLoading(false);
      }
    };

    getCurrentLocation();
  }, []);


  //Kullanıcının girdiği şehir adına göre hava durumu verilerini alır ve uygun state'lere atar.
  const handleSearch = async () => {
    setError(null);
    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric`);
      console.log('API yanıtı:', response.data); 
      const { coord } = response.data;
      if (coord) {
        await fetchWeatherData(coord.lat, coord.lon); 
      } else {
        setError('Koordinat bilgisi bulunamadı.');
      }
    } catch (error) {
      console.error('API hatası:', error); 
      setError('Şehir bulunamadı.');
    }
  };

  const currentHour = getCurrentHour();
  const daytime = isDaytime(currentHour);

  return (
    <div className="container">
      {loading && <p>LOADİNG...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <>
          <div className="forecast-layout">
            <div className="search-and-info">
              <div className="search-container">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Search for cities..."
                />
                <button onClick={handleSearch}>Click</button>
              </div>
              <div className="current-weather-info">
                <h1>
                  <img
                    src="/icons/location.icon.png"
                    alt="Location Icon"
                    className="location-icon"
                  />{" "}
                  {location}
                </h1>
                <p className="current-temperature">
                  {currentData ? `${Math.round(currentData.temperature)}°C` : 'Yükleniyor...'}
                </p>
                {currentData && ( 
                  <div className="current-info-wrapper">
                    <img
                      src={getIconUrl(currentData.weatherId, currentData.isDaytime)}
                      alt={currentData.weatherDescription}
                      className="current-weather-icon"
                    />
                    <p className="current-text">{currentData.weather}</p>
                  </div> 
                )}
              </div>
            </div>
  
            {/* 5 Günlük Tahmin Çerçevesir*/}
            <div className="daily-forecast-wrapper">
              {weather.map((day, index) => (
                <div key={index} className="daily-item">
                  <p className="days">{day.dayOfWeek}</p>
                  <p className="date">{day.date}</p>
                  <img
                    src={getIconUrl(day.weatherId, true)}
                    alt={day.weatherDescription}
                    className="weather-icon"
                  />
                  <p className="weatherDescription">{day.weatherDescription}</p>
                  <p className="temperature">
                    {Math.round(day.maxTemp)}° {Math.round(day.minTemp)}°
                  </p>
                </div>
              ))}
            </div>
          </div>
  
          {/* 24 Saatlik Hava Durumu ve Diğer Bilgiler */}
          <div className="forecast-info-layout">
            <div className="hourly-forecast-container">
              <h1>Daily Forecast</h1>
              <div className="hourly-forecast">
                {hourlyData.map((hour, index) => (
                  <div key={index} className="hourly-item">
                    <p>{hour.time}</p>
                    <img
                      src={getIconUrl(hour.weatherID, hour.isDaytime)}
                      alt={hour.weatherDescription}
                      className="hourly-icon"
                    />
                    <p>{hour.temperature}°C</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="current-weather">
              <h1>Today's Highlights</h1>
              <div className="current-info">
                <div className="info-item">
                  <div className="info-content">
                    <h1>Humidity</h1>
                  </div>
                  <div className="icon-info-wrapper">
                    <img
                      src="/icons/humidity(1).png"
                      alt="Humidity Icon"
                      className="humidity-icon"
                    />
                    <p>{currentData.humidity}%</p>
                 </div>
                  <p>{currentData.HumidityDescription}</p>
                </div>
                <div className="info-item">
                  <div className="info-content">
                    <h2>Sunrise&Sunset</h2>
                  </div>
                  <div className="sun-timing">
                    <div className="sun-event">
                      <img
                        src="/icons/sunrise (1).png"
                        alt="Sunrise Icon"
                        className="sunrise-icon"
                      />
                      <p>{currentData.sunrise}</p>
                    </div>
                    <div className="sun-event">
                      <img
                        src="/icons/sunset (1).png"
                        alt="Sunset Icon"
                        className="sunset-icon"
                      />
                      <p>{currentData.sunset}</p>
                    </div>
                  </div>
                </div>
                
                <div className="info-item">
                  <div className="info-content">
                    <h3>UV index</h3>
                  </div>
                  <div className="icon-info-wrapper">
                    <img
                      src="/icons/uv(1).png"
                      alt="UV Icon"
                      className="uv-icon"
                    />
                    <p>{currentData.uvIndex}</p>
                 </div>
                </div>
                <div className="info-item">
                  <div className="info-content">
                    <h4>Wind</h4>
                  </div>
                  <div className="icon-info-wrapper">
                    <img
                      src="/icons/wind(1).png"
                      alt="Wind Icon"
                      className="windsurfing-icon"
                    />
                    <p> {currentData.windSpeed} km/h</p>
                 </div>
                </div>
                <div className="info-item">
                  <div className="info-content">
                    <h5>Rain</h5>
                  </div>
                  <div className="icon-info-wrapper">
                    <img
                      src="/icons/yagis(1).png"
                      alt="Yağış Icon"
                      className="yagis-icon"
                    />
                    <p>{currentData.rainPercentage}%</p>
                 </div>
                </div>
                <div className="info-item">
                  <div className="info-content">
                    <h6>Visibility</h6>
                  </div>
                  <div className="icon-info-wrapper">
                    <img
                      src="/icons/visibility(1).png"
                      alt="Visibility Icon"
                      className="visibility-icon"
                    />
                    <p>{currentData.visibility} km</p>
                 </div>  
                </div>
              </div>
            </div>
            </div>
        </>
      )}
   </div>
 );
}
  

  