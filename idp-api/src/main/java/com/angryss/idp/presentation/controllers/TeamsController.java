package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.Team;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.List;
import java.util.UUID;

@Path("/v1/teams")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Teams", description = "Team management operations")
@Authenticated
@RunOnVirtualThread
public class TeamsController {

    @GET
    @Operation(summary = "List teams", description = "Retrieves all teams")
    @APIResponse(responseCode = "200", description = "Teams retrieved successfully")
    public List<Team> listTeams() {
        return Team.listAll();
    }

    @POST
    @Transactional
    @Operation(summary = "Create team", description = "Creates a new team")
    @APIResponse(responseCode = "201", description = "Team created successfully")
    public Response createTeam(Team team) {
        if (team.getId() != null) {
            throw new BadRequestException("ID must not be provided for new teams");
        }
        if (Team.find("name", team.getName()).firstResultOptional().isPresent()) {
            throw new BadRequestException("Team with this name already exists");
        }
        team.persist();
        return Response.status(Response.Status.CREATED).entity(team).build();
    }

    @GET
    @Path("/{id}/stacks")
    @Operation(summary = "Get team stacks", description = "Retrieves stacks associated with a team")
    @APIResponse(responseCode = "200", description = "Stacks retrieved successfully")
    public List<Stack> getTeamStacks(@PathParam("id") UUID teamId) {
        return Stack.findByTeamId(teamId);
    }
}
