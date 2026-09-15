package io.github.lecocubon.arquero;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ArqueroSaludPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
