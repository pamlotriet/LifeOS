import { Component, signal } from '@angular/core';
import { IonCard, IonIcon, IonLabel, IonButton } from '@ionic/angular';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
@Component({
  imports: [IonButton, IonLabel, IonIcon, IonCard],
  selector: 'app-vehicles',
  styleUrl: './vehicles.css',
  templateUrl: './vehicles.html',
})
export class Vehicles {
  cameraError = signal('');

  takePhoto = async () => {
    this.cameraError.set('');
    try {
      if (Capacitor.isNativePlatform()) {
        const { camera } = await Camera.requestPermissions({ permissions: ['camera'] });
        if (camera !== 'granted') {
          this.cameraError.set('Camera access is denied. Enable it in your device settings to take a photo.');
          return;
        }
      }

      const photo = await Camera.takePhoto({ includeMetadata: true });
      console.log('webPath:', photo.webPath);
      console.log('Format:', photo.metadata?.format);
      console.log('Size:', photo.metadata?.size);
    } catch (e) {
      console.error('takePhoto failed:', e);
      this.cameraError.set('Could not open the camera. Please try again.');
    }
  };

  pickMedia = async () => {
    try {
      const { results } = await Camera.chooseFromGallery({
        mediaType: MediaTypeSelection.All, // photos, videos, or both
        allowMultipleSelection: false,
        includeMetadata: true,
      });

      for (const item of results) {
        console.log('Type:', item.type); // MediaType.Photo or MediaType.Video
        console.log('webPath:', item.webPath);
        console.log('Format:', item.metadata?.format);
        console.log('Size:', item.metadata?.size);
      }
    } catch (e) {
      const error = e as any;
      const message = error.code ? `[${error.code}] ${error.message}` : error.message;
      console.error('chooseFromGallery failed:', message);
    }
  };
}
