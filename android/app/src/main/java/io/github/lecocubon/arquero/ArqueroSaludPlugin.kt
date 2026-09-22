package io.github.lecocubon.arquero

import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Build
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId

/**
 * Permisos de Health Connect en una sola hoja y escritura de entrenamientos.
 * Las lecturas las hace @capgo/capacitor-health; este plugin cubre lo que
 * ese no hace: guardar la sesion como ExerciseSessionRecord.
 */
@CapacitorPlugin(name = "ArqueroSalud")
class ArqueroSaludPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /** Nombre que usa la web -> permiso de Health Connect. */
    private val permisos: Map<String, String> = linkedMapOf(
        "peso" to HealthPermission.getReadPermission(WeightRecord::class),
        "grasa" to HealthPermission.getReadPermission(BodyFatRecord::class),
        "pulso" to HealthPermission.getReadPermission(HeartRateRecord::class),
        "pulsoReposo" to HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        "sueno" to HealthPermission.getReadPermission(SleepSessionRecord::class),
        "guardarEntrenamiento" to HealthPermission.getWritePermission(ExerciseSessionRecord::class),
    )

    private suspend fun estadoActual(): JSObject {
        val respuesta = JSObject()
        val sdk = HealthConnectClient.getSdkStatus(context)
        if (sdk != HealthConnectClient.SDK_AVAILABLE) {
            respuesta.put("disponible", false)
            respuesta.put(
                "motivo",
                if (sdk == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) "actualizar" else "sin-instalar",
            )
            respuesta.put("concedidos", JSArray())
            return respuesta
        }
        val concedidos = HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()
        respuesta.put("disponible", true)
        respuesta.put("concedidos", JSArray(permisos.filterValues { it in concedidos }.keys.toList()))
        return respuesta
    }

    private fun resolverEstado(call: PluginCall) {
        scope.launch {
            try {
                call.resolve(estadoActual())
            } catch (e: Exception) {
                call.reject(e.message ?: "No se pudo consultar Health Connect", e)
            }
        }
    }

    @PluginMethod
    fun estado(call: PluginCall) = resolverEstado(call)

    @PluginMethod
    fun pedirPermisos(call: PluginCall) {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            resolverEstado(call)
            return
        }
        val intent = PermissionController.createRequestPermissionResultContract()
            .createIntent(context, permisos.values.toSet())
        startActivityForResult(call, intent, "alResponderPermisos")
    }

    @ActivityCallback
    private fun alResponderPermisos(call: PluginCall, @Suppress("UNUSED_PARAMETER") resultado: ActivityResult) {
        // El resultado del contrato no es fiable en todas las versiones: se consulta lo concedido.
        resolverEstado(call)
    }

    @PluginMethod
    fun abrirAjustes(call: PluginCall) {
        // En Android 14+ Health Connect es parte del sistema y la accion de androidx no existe.
        val acciones = listOfNotNull(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) "android.health.connect.action.HEALTH_HOME_SETTINGS" else null,
            HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS,
        )
        for (accion in acciones) {
            try {
                activity.startActivity(Intent(accion))
                call.resolve()
                return
            } catch (_: ActivityNotFoundException) {
                // se prueba la siguiente
            }
        }
        call.reject("No se pudo abrir Health Connect")
    }

    @PluginMethod
    fun guardarEntrenamiento(call: PluginCall) {
        val idCliente = call.getString("idCliente") ?: return call.reject("Falta idCliente")
        val inicio = call.getString("inicio")?.let(Instant::parse) ?: return call.reject("Falta inicio")
        val fin = call.getString("fin")?.let(Instant::parse) ?: return call.reject("Falta fin")
        if (!fin.isAfter(inicio)) return call.reject("El fin debe ser posterior al inicio")
        val version = call.data.optLong("version", System.currentTimeMillis())
        val zona = ZoneId.systemDefault().rules

        // Mismo clientRecordId con version mayor = Health Connect actualiza, no duplica.
        val registro = ExerciseSessionRecord(
            startTime = inicio,
            startZoneOffset = zona.getOffset(inicio),
            endTime = fin,
            endZoneOffset = zona.getOffset(fin),
            metadata = Metadata.manualEntry(clientRecordId = idCliente, clientRecordVersion = version),
            exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
            title = call.getString("titulo"),
            notes = call.getString("notas"),
        )
        scope.launch {
            try {
                val resultado = HealthConnectClient.getOrCreate(context).insertRecords(listOf(registro))
                call.resolve(JSObject().put("id", resultado.recordIdsList.firstOrNull() ?: ""))
            } catch (e: Exception) {
                call.reject(e.message ?: "No se pudo guardar en Health Connect", e)
            }
        }
    }

    override fun handleOnDestroy() {
        scope.cancel()
        super.handleOnDestroy()
    }
}
