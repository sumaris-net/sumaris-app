export function bluetoothClassToMatIcon(bluetoothClass: number): string {
  const majorDeviceClass = (bluetoothClass & 0x1F00) >> 8;

  switch (majorDeviceClass) {
    case 1: // Computer
      return 'computer';
    case 2: // Phone
      return 'smartphone';
    case 3: // Networking
      return 'router';
    case 4: // Audio/Video
      return 'headset';
    case 5: // Peripheral
      return 'keyboard';
    case 6: // Imaging
      return 'photo_camera';
    case 7: // Wearable
      return 'watch';
    case 8: // Toy
      return 'toys';
    case 9: // Health
      return 'fitness_center';
    default:
      return 'device_unknown';
  }
}
