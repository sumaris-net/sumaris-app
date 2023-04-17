package net.sumaris.app;

import com.getcapacitor.BridgeActivity;
import com.bluetoothserial.plugin.BluetoothSerial;

public class MainActivity extends BridgeActivity {
@Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
      add(BluetoothSerial.class);
    }});
  }
}
