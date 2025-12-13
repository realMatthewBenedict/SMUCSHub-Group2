package controllers;

import play.Environment;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;

import javax.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MockInterviewController extends Controller {

    private final Environment env;

    @Inject
    public MockInterviewController(Environment env) {
        this.env = env;
    }

    public Result list(Long userId, String role, Integer limit) {
        try (InputStream is = env.resourceAsStream("public/data/mock/interviews.json")) {
            if (is == null) {
                return internalServerError("mock interviews file not found: public/data/mock/interviews.json");
            }

            // Java 8 read
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            int n;
            while ((n = is.read(chunk)) != -1) {
                buffer.write(chunk, 0, n);
            }

            String raw = new String(buffer.toByteArray(), StandardCharsets.UTF_8);

            return ok(Json.parse(raw)).as("application/json");
        } catch (Exception e) {
            return internalServerError("Failed to load mock interviews: " + e.getMessage());
        }
    }
}
