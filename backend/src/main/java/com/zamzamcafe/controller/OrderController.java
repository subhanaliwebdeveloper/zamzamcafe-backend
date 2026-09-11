package com.zamzamcafe.controller;

import com.zamzamcafe.model.*;
import com.zamzamcafe.repository.OrderRepository;
import com.zamzamcafe.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/orders")
public class OrderController {
    private final OrderRepository repo;
    private final ProductRepository productRepo;
    public OrderController(OrderRepository repo, ProductRepository productRepo){this.repo=repo;this.productRepo=productRepo;}
    @GetMapping public List<Order> all(@RequestParam(required=false) String phone){ if(phone!=null && !phone.isBlank()) return repo.findByPhone(phone); return repo.findAll(); }
    @PostMapping public Order create(@RequestBody Order o){
        if(o == null || isBlank(o.getCustomerName()) || isBlank(o.getPhone()) || isBlank(o.getAddress())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name, phone, and address are required.");
        }
        String phone = o.getPhone().trim();
        if(!phone.matches("[0-9]{7,15}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone must contain 7 to 15 digits.");
        }
        if(o.getCustomerName().trim().length() > 120 || o.getAddress().trim().length() > 1000 || (o.getNotes() != null && o.getNotes().length() > 1000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order details are too long.");
        }
        if(o.getPaymentMethod() == null || !Set.of("COD", "PAY_AT_CAFE").contains(o.getPaymentMethod())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payment method.");
        }
        o.setCustomerName(o.getCustomerName().trim());
        o.setPhone(phone);
        o.setAddress(o.getAddress().trim());
        if(o.getItems() == null || o.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one product is required.");
        }
        if(o.getItems().size() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An order cannot contain more than 50 items.");
        }

        long subtotal = 0;
        for(OrderItem item : o.getItems()) {
            if(item.getProductId() == null || item.getQuantity() == null || item.getQuantity() <= 0 || item.getQuantity() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each order item needs a valid product and quantity.");
            }
            Product product = productRepo.findById(item.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product not found."));
            if(!product.isAvailable() || product.getPrice() == null || product.getPrice() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A selected product is unavailable.");
            }
            item.setProductName(product.getName());
            item.setUnitPrice(product.getPrice());
            item.setOrder(o);
            subtotal += (long) product.getPrice() * item.getQuantity();
            if(subtotal > Integer.MAX_VALUE) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order total is too large.");
            }
        }
        int calculatedSubtotal = (int) subtotal;
        int deliveryFee = 0;
        o.setSubtotal(calculatedSubtotal);
        o.setDeliveryFee(deliveryFee);
        o.setTotal(calculatedSubtotal + deliveryFee);
        return repo.save(o);
    }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id){
        if(!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found.");
        repo.deleteById(id);
    }
    @PutMapping("/{id}/status") public Order status(@PathVariable Long id,@RequestParam String status){
        Set<String> validStatuses = Set.of("NEW", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED");
        if(status == null || !validStatuses.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid order status.");
        }
        Order o=repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found."));
        o.setStatus(status); return repo.save(o);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}