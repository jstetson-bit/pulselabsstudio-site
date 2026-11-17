// PulseKey.java — offline Pulse key check for Android apps (API 21+, no internet, no libraries).
// Usage: PulseKey.Result r = PulseKey.check(PUBLIC_KEY, pastedKey, "plspdf"); if (r != null) unlock();
// PUBLIC_KEY = the "PUBLIC" line printed by store/keys/make-keypair.mjs (65-byte uncompressed P-256 point, base64url).
package com.pulselabs.common;

import android.util.Base64;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.*;
import org.json.JSONObject;

public final class PulseKey {
    public static final class Result { public String product, order; public long issued; }

    public static Result check(String publicRaw, String key, String productId) {
        try {
            if (key == null) return null;
            key = key.trim();
            if (!key.startsWith("PLS1-")) return null;
            int dot = key.indexOf('.');
            String body = key.substring(5, dot), sig = key.substring(dot + 1);
            byte[] pt = b64(publicRaw);
            if (pt.length != 65 || pt[0] != 4) return null;
            AlgorithmParameters ap = AlgorithmParameters.getInstance("EC");
            ap.init(new ECGenParameterSpec("secp256r1"));
            ECParameterSpec spec = ap.getParameterSpec(ECParameterSpec.class);
            ECPoint w = new ECPoint(new BigInteger(1, java.util.Arrays.copyOfRange(pt, 1, 33)), new BigInteger(1, java.util.Arrays.copyOfRange(pt, 33, 65)));
            PublicKey pk = KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(w, spec));
            Signature v = Signature.getInstance("SHA256withECDSA");
            v.initVerify(pk);
            v.update(body.getBytes(StandardCharsets.US_ASCII));
            if (!v.verify(der(b64(sig)))) return null;
            JSONObject j = new JSONObject(new String(b64(body), StandardCharsets.UTF_8));
            if (productId != null && !productId.equals(j.optString("p"))) return null;
            Result r = new Result(); r.product = j.optString("p"); r.order = j.optString("o"); r.issued = j.optLong("t");
            return r;
        } catch (Exception e) { return null; }
    }

    static byte[] b64(String s) { return Base64.decode(s, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP); }

    // WebCrypto signs as raw r||s (64 bytes); Java wants DER
    static byte[] der(byte[] rs) {
        if (rs.length != 64) return rs;
        byte[] r = trim(java.util.Arrays.copyOfRange(rs, 0, 32)), s = trim(java.util.Arrays.copyOfRange(rs, 32, 64));
        byte[] out = new byte[6 + r.length + s.length];
        out[0] = 0x30; out[1] = (byte) (4 + r.length + s.length);
        out[2] = 0x02; out[3] = (byte) r.length; System.arraycopy(r, 0, out, 4, r.length);
        out[4 + r.length] = 0x02; out[5 + r.length] = (byte) s.length; System.arraycopy(s, 0, out, 6 + r.length, s.length);
        return out;
    }
    static byte[] trim(byte[] x) {
        int i = 0; while (i < x.length - 1 && x[i] == 0 && (x[i + 1] & 0x80) == 0) i++;
        byte[] y = java.util.Arrays.copyOfRange(x, i, x.length);
        if ((y[0] & 0x80) != 0) { byte[] z = new byte[y.length + 1]; System.arraycopy(y, 0, z, 1, y.length); return z; }
        return y;
    }
}
