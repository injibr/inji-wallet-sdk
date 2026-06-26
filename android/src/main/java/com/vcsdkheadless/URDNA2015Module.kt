package com.vcsdkheadless

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.util.Base64
import android.util.Log
import foundation.identity.jsonld.ConfigurableDocumentLoader
import foundation.identity.jsonld.JsonLDObject
import info.weboftrust.ldsignatures.LdProof
import info.weboftrust.ldsignatures.canonicalizer.URDNA2015Canonicalizer

class URDNA2015Module(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun canonicalizeForSigning(combinedVpJson: String, promise: Promise) {
        Thread {
            try {
                Log.d(TAG, "canonicalizeForSigning called, length: ${combinedVpJson.length}")

                val confDocumentLoader = ConfigurableDocumentLoader()
                confDocumentLoader.isEnableHttps = true
                confDocumentLoader.isEnableHttp = true
                confDocumentLoader.isEnableFile = false

                val jsonLdObject = JsonLDObject.fromJson(combinedVpJson)
                jsonLdObject.documentLoader = confDocumentLoader

                val ldProof = LdProof.getFromJsonLDObject(jsonLdObject)
                Log.d(TAG, "LdProof type: ${ldProof.type}")

                val canonicalizer = URDNA2015Canonicalizer()
                val canonicalHashBytes = canonicalizer.canonicalize(ldProof, jsonLdObject)
                Log.d(TAG, "Canonicalization SUCCESS: ${canonicalHashBytes.size} bytes")

                val result = Base64.encodeToString(
                    canonicalHashBytes,
                    Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP
                )
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "canonicalizeForSigning error", e)
                promise.reject("URDNA2015_ERROR", e.message ?: "Unknown error", e)
            }
        }.start()
    }

    companion object {
        const val NAME = "URDNA2015"
        private const val TAG = "URDNA2015Module"
    }
}
