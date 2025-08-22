export interface ChatContext {
  currentDate: string;
  currentTime: string;
  timezone: string;
  location: string;
  coordinates?: { lat: number; lng: number };
}

export class ContextManager {
  private context: ChatContext | null = null;
  private locationPermissionGranted: boolean = false;
  private onContextUpdateCallback?: () => void;

  constructor(onContextUpdate?: () => void) {
    this.onContextUpdateCallback = onContextUpdate;
    this.initializeContext();
  }

  private async initializeContext(): Promise<void> {
    try {
      // Get current date and time
      const now = new Date();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Set initial context with fallback location immediately
      this.context = {
        currentDate: now.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        currentTime: now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZoneName: 'short'
        }),
        timezone: timezone,
        location: 'Brisbane, Australia',
        coordinates: { lat: -27.4698, lng: 153.0251 }
      };

      console.log('📍 Context initialized with fallback:', this.context);

      // Try to get user location asynchronously (non-blocking)
      this.requestLocationPermission().then(() => {
        if (this.locationPermissionGranted) {
          this.getCurrentLocation();
        }
      }).catch(() => {
        console.log('📍 Using fallback location');
      });

    } catch (error) {
      console.error('❌ Error initializing context:', error);
      // Ensure fallback is set
      this.setFallbackLocation();
    }
  }

  private async requestLocationPermission(): Promise<void> {
    try {
      if ('geolocation' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permission.state === 'granted') {
          this.locationPermissionGranted = true;
        } else if (permission.state === 'prompt') {
          // Request permission
          const position = await this.getCurrentPosition();
          if (position) {
            this.locationPermissionGranted = true;
          }
        }
      }
    } catch (error) {
      console.log('📍 Location permission denied or unavailable, using fallback');
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  private async getCurrentLocation(): Promise<void> {
    try {
      const position = await this.getCurrentPosition();
      if (position && this.context) {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocoding to get location name
        const locationName = await this.reverseGeocode(latitude, longitude);
        
        this.context.coordinates = { lat: latitude, lng: longitude };
        this.context.location = locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        
        console.log('📍 Location updated:', this.context.location);
        
        // Notify UI that context has been updated
        if (this.onContextUpdateCallback) {
          this.onContextUpdateCallback();
        }
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      this.setFallbackLocation();
    }
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        
        // Build a readable location string
        const parts = [];
        if (address.city) parts.push(address.city);
        else if (address.town) parts.push(address.town);
        else if (address.village) parts.push(address.village);
        
        if (address.state) parts.push(address.state);
        if (address.country) parts.push(address.country);
        
        return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (error) {
      console.error('❌ Reverse geocoding failed:', error);
    }
    
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  private setFallbackLocation(): void {
    if (this.context) {
      this.context.location = 'Brisbane, Australia';
      this.context.coordinates = { lat: -27.4698, lng: 153.0251 };
    }
  }

  public getContext(): ChatContext | null {
    return this.context;
  }

  public updateContext(): void {
    if (this.context) {
      const now = new Date();
      this.context.currentDate = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      this.context.currentTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short'
      });
    }
  }

  public formatContextForPrompt(): string {
    if (!this.context) return '';
    
    this.updateContext(); // Update time/date to current moment
    
    return `Current Context:
- Date: ${this.context.currentDate}
- Time: ${this.context.currentTime}
- Timezone: ${this.context.timezone}
- Location: ${this.context.location}
${this.context.coordinates ? `- Coordinates: ${this.context.coordinates.lat}, ${this.context.coordinates.lng}` : ''}

Please consider this context when responding to the user's message.`;
  }

  public async refreshLocation(): Promise<void> {
    try {
      console.log('📍 Refreshing location...');
      
      // First, try to re-request permission if not already granted
      if (!this.locationPermissionGranted) {
        await this.requestLocationPermission();
      }
      
      // If permission is granted (either previously or just now), get location
      if (this.locationPermissionGranted) {
        await this.getCurrentLocation();
      } else {
        // If permission is still denied, try to prompt user anyway
        console.log('📍 Permission not granted, attempting to request location...');
        const position = await this.getCurrentPosition();
        if (position && this.context) {
          const { latitude, longitude } = position.coords;
          const locationName = await this.reverseGeocode(latitude, longitude);
          
          this.context.coordinates = { lat: latitude, lng: longitude };
          this.context.location = locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          this.locationPermissionGranted = true;
          
          console.log('📍 Location updated via direct request:', this.context.location);
          
          // Notify UI that context has been updated
          if (this.onContextUpdateCallback) {
            this.onContextUpdateCallback();
          }
        } else {
          console.log('📍 Location request failed, keeping fallback');
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing location:', error);
    }
  }

  public ensureContextAvailable(): void {
    // If context is null, initialize it immediately with fallback
    if (!this.context) {
      const now = new Date();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      this.context = {
        currentDate: now.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        currentTime: now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZoneName: 'short'
        }),
        timezone: timezone,
        location: 'Brisbane, Australia',
        coordinates: { lat: -27.4698, lng: 153.0251 }
      };

      console.log('📍 Context ensured with fallback:', this.context);
      
      // Notify UI that context is now available
      if (this.onContextUpdateCallback) {
        this.onContextUpdateCallback();
      }
    }
  }
}
