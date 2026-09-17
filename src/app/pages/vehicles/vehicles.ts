import { Component } from '@angular/core';
import { IonCard, IonIcon, IonLabel, IonButton } from '@ionic/angular';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
@Component({
  imports: [IonButton, IonLabel, IonIcon, IonCard],
  selector: 'app-vehicles',
  styleUrl: './vehicles.css',
  templateUrl: './vehicles.html',
})
export class Vehicles {
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
