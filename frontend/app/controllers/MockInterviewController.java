package controllers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import play.Environment;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;

import javax.inject.Inject;
import java.io.InputStream;

public class MockInterviewController extends Controller {

    private final Environment env;

    @Inject
    public MockInterviewController(Environment env) {
        this.env = env;
    }

    public Result listInterviews(String userId, String role, Integer limit, Integer offset) {
        // Local only: block in prod/test
        if (!env.isDev()) {
            return notFound();
        }

        int lim = (limit == null) ? 100 : Math.min(limit, 1000);
        int off = (offset == null) ? 0 : Math.max(offset, 0);

        // Load deterministic fixture from conf/mock/interviews.json
        try (InputStream is = env.resourceAsStream("mock/interviews.json")) {
            if (is == null) return internalServerError("Missing mock/interviews.json");

            JsonNode root = Json.parse(is);

            // Expect root has "items"
            JsonNode items = root.get("items");
            if (items == null || !items.isArray()) return internalServerError("Mock JSON missing items[]");

            // (Optional) filter by userId/role
            // For now: deterministic, no filtering, just paginate the array.

            int total = items.size();
            int from = Math.min(off, total);
            int to = Math.min(off + lim, total);

            ObjectNode out = Json.newObject();
            out.put("limit", lim);
            out.put("offset", off);
            out.put("total", total);
            out.set("items", items.deepCopy().subList(from, to));

            return ok(out);
        } catch (Exception e) {
            return internalServerError("Mock API error: " + e.getMessage());
        }
    }
}
